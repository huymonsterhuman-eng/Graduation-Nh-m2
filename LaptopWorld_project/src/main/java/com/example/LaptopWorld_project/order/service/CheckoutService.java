package com.example.LaptopWorld_project.order.service;

import com.example.LaptopWorld_project.catalog.entity.Product;
import com.example.LaptopWorld_project.catalog.entity.ProductImage;
import com.example.LaptopWorld_project.common.exception.BusinessException;
import com.example.LaptopWorld_project.common.exception.ResourceNotFoundException;
import com.example.LaptopWorld_project.order.dto.CheckoutRequest;
import com.example.LaptopWorld_project.order.dto.CheckoutResponse;
import com.example.LaptopWorld_project.order.dto.OrderDetailDto;
import com.example.LaptopWorld_project.payment.vnpay.VnpayService;
import com.example.LaptopWorld_project.order.entity.*;
import com.example.LaptopWorld_project.order.mapper.OrderMapper;
import com.example.LaptopWorld_project.order.repository.CartRepository;
import com.example.LaptopWorld_project.order.repository.OrderRepository;
import com.example.LaptopWorld_project.user.entity.Address;
import com.example.LaptopWorld_project.user.repository.AddressRepository;
import com.example.LaptopWorld_project.voucher.entity.UserVoucher;
import com.example.LaptopWorld_project.voucher.entity.Voucher;
import com.example.LaptopWorld_project.voucher.repository.UserVoucherRepository;
import com.example.LaptopWorld_project.voucher.repository.VoucherRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class CheckoutService {

    private static final int MAX_CODE_RETRY = 5;

    private final CartRepository cartRepository;
    private final OrderRepository orderRepository;
    private final AddressRepository addressRepository;
    private final VoucherRepository voucherRepository;
    private final UserVoucherRepository userVoucherRepository;
    private final OrderCodeGenerator codeGenerator;
    private final OrderMapper orderMapper;
    private final com.example.LaptopWorld_project.catalog.repository.ProductRepository productRepository;
    private final VnpayService vnpayService;

    /**
     * Đặt hàng từ giỏ hàng hiện tại.
     * Toàn bộ trong 1 transaction — bất kỳ bước fail nào rollback tất cả.
     *
     * Nếu paymentMethod=vnpay → sinh thêm paymentUrl để FE redirect sang cổng VNPay.
     * IP client dùng để nhồi vào vnp_IpAddr (VNPay yêu cầu).
     */
    @Transactional
    public CheckoutResponse placeOrder(Long userId, CheckoutRequest req, String clientIp) {
        // 1. Cart
        Cart cart = cartRepository.findByUserId(userId)
                .orElseThrow(() -> new BusinessException("EMPTY_CART", "Giỏ hàng trống"));
        if (cart.getItems().isEmpty()) {
            throw new BusinessException("EMPTY_CART", "Giỏ hàng trống");
        }

        // 2. Address (verify ownership)
        Address address = addressRepository.findByIdAndUserId(req.addressId(), userId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Địa chỉ không tồn tại hoặc không thuộc về bạn"));

        // 3. Validate + build order details + calculate subtotal
        Order order = new Order();
        order.setUser(cart.getUser());
        BigDecimal subtotal = BigDecimal.ZERO;

        for (CartItem item : cart.getItems()) {
            // Lock row Product để tránh race — 2 khách cùng đặt SP cuối
            Product p = productRepository.findByIdForUpdate(item.getProduct().getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Product", item.getProduct().getId()));
            if (!p.isActive()) {
                throw new BusinessException("PRODUCT_INACTIVE",
                        "Sản phẩm '" + p.getName() + "' đã ngừng bán");
            }
            int available = p.getAvailableStock();
            if (item.getQuantity() > available) {
                throw new BusinessException("INSUFFICIENT_STOCK",
                        "Sản phẩm '" + p.getName() + "' không đủ tồn kho (còn " + available + ")");
            }

            OrderDetail d = new OrderDetail();
            d.setProduct(p);
            d.setProductName(p.getName());
            d.setProductImage(primaryImagePath(p));
            d.setQuantity(item.getQuantity());
            d.setPriceAtPurchase(p.getEffectivePrice());  // snapshot giá hiện tại
            order.addDetail(d);

            // Reserve stock — chưa trừ stock nhưng "giữ chỗ" cho đơn này
            p.setReservedStock(p.getReservedStock() + item.getQuantity());
            productRepository.save(p);

            subtotal = subtotal.add(d.getLineTotal());
        }
        order.setSubtotal(subtotal);

        // 4. Voucher (optional)
        BigDecimal discount = BigDecimal.ZERO;
        Voucher voucher = null;
        UserVoucher userVoucher = null;

        if (req.voucherCode() != null && !req.voucherCode().isBlank()) {
            voucher = voucherRepository.findByCode(req.voucherCode())
                    .orElseThrow(() -> new BusinessException("VOUCHER_NOT_FOUND",
                            "Voucher không tồn tại: " + req.voucherCode()));
            if (!voucher.isValid(subtotal)) {
                throw new BusinessException("VOUCHER_INVALID",
                        "Voucher không hợp lệ cho đơn hàng này");
            }
            discount = voucher.calculateDiscount(subtotal);

            // Nếu user đã save voucher này, mark used ở user_voucher.
            // Nếu chưa save mà vẫn nhập code, tạm thời cho phép (không strict).
            userVoucher = userVoucherRepository
                    .findByUserIdAndVoucherId(userId, voucher.getId())
                    .orElse(null);
            if (userVoucher != null && userVoucher.isUsed()) {
                throw new BusinessException("VOUCHER_ALREADY_USED",
                        "Voucher đã được sử dụng trước đó");
            }
        }
        order.setVoucher(voucher);
        order.setDiscountAmount(discount);

        // 5. Shipping + total
        order.setShippingFee(req.shippingFee());
        order.setShippingMethod(req.shippingMethod());
        order.setShippingName(address.getName());
        order.setShippingPhone(address.getPhone());
        order.setShippingAddress(buildFullAddress(address));
        order.setPaymentMethod(req.paymentMethod());
        // COD mặc định unpaid, các phương thức khác cũng unpaid đến khi callback
        order.setPaymentStatus(PaymentStatus.unpaid);
        order.setStatus(OrderStatus.pending);
        order.setTotal(subtotal.subtract(discount).add(req.shippingFee()));

        // 6. Save order với code — retry nếu collision
        Order saved = saveWithUniqueCode(order);

        // 7. Cập nhật voucher (tăng used_count + mark user_voucher used)
        if (voucher != null) {
            voucher.incrementUsed();
            voucherRepository.save(voucher);
            if (userVoucher != null) {
                userVoucher.setUsed(true);
                userVoucher.setUsedAt(OffsetDateTime.now());
                userVoucher.setOrderId(saved.getId());
                userVoucherRepository.save(userVoucher);
            }
        }

        // 8. Clear cart
        cart.getItems().clear();
        cartRepository.save(cart);

        log.info("Order placed: userId={} code={} total={}",
                userId, saved.getCode(), saved.getTotal());

        // 9. Nếu chọn VNPay → build paymentUrl để FE redirect. COD/khác → null.
        String paymentUrl = null;
        if (saved.getPaymentMethod() == PaymentMethod.vnpay) {
            paymentUrl = vnpayService.createPaymentUrl(saved, clientIp);
        }

        return new CheckoutResponse(orderMapper.toDetail(saved), paymentUrl);
    }

    private Order saveWithUniqueCode(Order order) {
        for (int i = 0; i < MAX_CODE_RETRY; i++) {
            try {
                order.setCode(codeGenerator.next());
                return orderRepository.saveAndFlush(order);
            } catch (DataIntegrityViolationException ex) {
                log.warn("Order code collision, retry {}/{}", i + 1, MAX_CODE_RETRY);
            }
        }
        throw new BusinessException("ORDER_CODE_COLLISION",
                "Không sinh được mã đơn duy nhất sau " + MAX_CODE_RETRY + " lần thử");
    }

    private String buildFullAddress(Address a) {
        StringBuilder sb = new StringBuilder(a.getAddress());
        if (a.getWard() != null && !a.getWard().isBlank())         sb.append(", ").append(a.getWard());
        if (a.getDistrict() != null && !a.getDistrict().isBlank()) sb.append(", ").append(a.getDistrict());
        if (a.getProvince() != null && !a.getProvince().isBlank()) sb.append(", ").append(a.getProvince());
        return sb.toString();
    }

    private String primaryImagePath(Product p) {
        return p.getImages().stream()
                .filter(ProductImage::isPrimary)
                .map(ProductImage::getPath)
                .findFirst()
                .orElseGet(() -> p.getImages().isEmpty() ? null : p.getImages().get(0).getPath());
    }
}

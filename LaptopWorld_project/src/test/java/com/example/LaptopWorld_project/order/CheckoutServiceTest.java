package com.example.LaptopWorld_project.order;

import com.example.LaptopWorld_project.catalog.entity.Product;
import com.example.LaptopWorld_project.catalog.repository.ProductRepository;
import com.example.LaptopWorld_project.common.exception.BusinessException;
import com.example.LaptopWorld_project.order.dto.CheckoutRequest;
import com.example.LaptopWorld_project.order.dto.CheckoutResponse;
import com.example.LaptopWorld_project.order.entity.Cart;
import com.example.LaptopWorld_project.order.entity.CartItem;
import com.example.LaptopWorld_project.order.entity.Order;
import com.example.LaptopWorld_project.order.entity.PaymentMethod;
import com.example.LaptopWorld_project.order.mapper.OrderMapper;
import com.example.LaptopWorld_project.order.repository.CartRepository;
import com.example.LaptopWorld_project.order.repository.OrderRepository;
import com.example.LaptopWorld_project.order.service.CheckoutService;
import com.example.LaptopWorld_project.order.service.OrderCodeGenerator;
import com.example.LaptopWorld_project.payment.vnpay.VnpayService;
import com.example.LaptopWorld_project.user.entity.Address;
import com.example.LaptopWorld_project.user.entity.User;
import com.example.LaptopWorld_project.user.repository.AddressRepository;
import com.example.LaptopWorld_project.voucher.entity.Voucher;
import com.example.LaptopWorld_project.voucher.entity.VoucherType;
import com.example.LaptopWorld_project.voucher.repository.UserVoucherRepository;
import com.example.LaptopWorld_project.voucher.repository.VoucherRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CheckoutServiceTest {

    @Mock CartRepository cartRepository;
    @Mock OrderRepository orderRepository;
    @Mock AddressRepository addressRepository;
    @Mock VoucherRepository voucherRepository;
    @Mock UserVoucherRepository userVoucherRepository;
    @Mock OrderCodeGenerator codeGenerator;
    @Mock OrderMapper orderMapper;
    @Mock ProductRepository productRepository;
    @Mock VnpayService vnpayService;

    @InjectMocks CheckoutService checkoutService;

    private static final Long USER_ID = 1L;
    private static final Long ADDR_ID = 10L;
    private static final Long PRODUCT_ID = 100L;

    private User user;
    private Address address;
    private Product product;

    @BeforeEach
    void setUp() {
        user = new User();
        ReflectionTestUtils.setField(user, "id", USER_ID);

        address = new Address();
        ReflectionTestUtils.setField(address, "id", ADDR_ID);
        address.setName("Nguyen Van A");
        address.setPhone("0900000001");
        address.setAddress("123 Duong ABC");
        address.setWard("Phuong 1");
        address.setDistrict("Quan 1");
        address.setProvince("TPHCM");

        product = new Product();
        ReflectionTestUtils.setField(product, "id", PRODUCT_ID);
        product.setName("Laptop test");
        product.setPrice(new BigDecimal("20000000"));
        product.setStock(10);
        product.setReservedStock(0);
        product.setActive(true);
        product.setImages(new ArrayList<>());
    }

    private Cart buildCartWithItem(int qty) {
        Cart cart = new Cart();
        cart.setUser(user);
        List<CartItem> items = new ArrayList<>();
        if (qty > 0) {
            CartItem item = new CartItem();
            item.setProduct(product);
            item.setQuantity(qty);
            items.add(item);
        }
        cart.setItems(items);
        return cart;
    }

    private CheckoutRequest buildRequest(PaymentMethod method, String voucherCode) {
        return new CheckoutRequest(
                ADDR_ID,
                method,
                voucherCode,
                "standard",
                new BigDecimal("30000"),
                null
        );
    }

    @Test
    @DisplayName("EMPTY_CART — throw khi cart trong")
    void placeOrder_emptyCart_throws() {
        Cart emptyCart = new Cart();
        emptyCart.setUser(user);
        emptyCart.setItems(new ArrayList<>());
        when(cartRepository.findByUserId(USER_ID)).thenReturn(Optional.of(emptyCart));

        assertThatThrownBy(() -> checkoutService.placeOrder(USER_ID,
                buildRequest(PaymentMethod.cod, null), "127.0.0.1"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Giỏ hàng trống");
    }

    @Test
    @DisplayName("INSUFFICIENT_STOCK — throw khi quantity > availableStock")
    void placeOrder_insufficientStock_throws() {
        product.setStock(2); // chi con 2, nhung cart order 5
        Cart cart = buildCartWithItem(5);

        when(cartRepository.findByUserId(USER_ID)).thenReturn(Optional.of(cart));
        when(addressRepository.findByIdAndUserId(ADDR_ID, USER_ID)).thenReturn(Optional.of(address));
        when(productRepository.findByIdForUpdate(PRODUCT_ID)).thenReturn(Optional.of(product));

        assertThatThrownBy(() -> checkoutService.placeOrder(USER_ID,
                buildRequest(PaymentMethod.cod, null), "127.0.0.1"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("không đủ tồn kho");
    }

    @Test
    @DisplayName("VOUCHER_INVALID — throw khi voucher da het han")
    void placeOrder_expiredVoucher_throws() {
        Cart cart = buildCartWithItem(1);

        Voucher expired = new Voucher();
        expired.setCode("EXPIRED");
        expired.setType(VoucherType.fixed);
        expired.setDiscountAmount(new BigDecimal("100000"));
        expired.setMinOrderValue(BigDecimal.ZERO);
        expired.setActive(true);
        expired.setExpiresAt(OffsetDateTime.now().minusDays(1));

        when(cartRepository.findByUserId(USER_ID)).thenReturn(Optional.of(cart));
        when(addressRepository.findByIdAndUserId(ADDR_ID, USER_ID)).thenReturn(Optional.of(address));
        when(productRepository.findByIdForUpdate(PRODUCT_ID)).thenReturn(Optional.of(product));
        when(voucherRepository.findByCode("EXPIRED")).thenReturn(Optional.of(expired));

        assertThatThrownBy(() -> checkoutService.placeOrder(USER_ID,
                buildRequest(PaymentMethod.cod, "EXPIRED"), "127.0.0.1"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Voucher không hợp lệ");
    }

    @Test
    @DisplayName("Success COD — reserved_stock tang, voucher increment, paymentUrl=null")
    void placeOrder_codSuccess_reservesStockAndReturnsNullUrl() {
        Cart cart = buildCartWithItem(2);
        Voucher voucher = new Voucher();
        voucher.setCode("SALE10");
        voucher.setType(VoucherType.percent);
        voucher.setDiscountAmount(new BigDecimal("10"));
        voucher.setMinOrderValue(BigDecimal.ZERO);
        voucher.setActive(true);

        when(cartRepository.findByUserId(USER_ID)).thenReturn(Optional.of(cart));
        when(addressRepository.findByIdAndUserId(ADDR_ID, USER_ID)).thenReturn(Optional.of(address));
        when(productRepository.findByIdForUpdate(PRODUCT_ID)).thenReturn(Optional.of(product));
        when(voucherRepository.findByCode("SALE10")).thenReturn(Optional.of(voucher));
        when(userVoucherRepository.findByUserIdAndVoucherId(USER_ID, null)).thenReturn(Optional.empty());
        when(codeGenerator.next()).thenReturn("ORD-20260825-001");
        when(orderRepository.saveAndFlush(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));
        when(orderMapper.toDetail(any(Order.class))).thenReturn(null);

        CheckoutResponse resp = checkoutService.placeOrder(USER_ID,
                buildRequest(PaymentMethod.cod, "SALE10"), "127.0.0.1");

        // COD → khong goi VNPay → paymentUrl null
        assertThat(resp.paymentUrl()).isNull();
        // Reserved stock tang len 2
        assertThat(product.getReservedStock()).isEqualTo(2);
        // Voucher used_count += 1
        assertThat(voucher.getUsedCount()).isEqualTo(1);
        // VNPay khong duoc goi
        verify(vnpayService, never()).createPaymentUrl(any(), any());
    }

    @Test
    @DisplayName("Success VNPay — paymentUrl != null va la URL VNPay")
    void placeOrder_vnpaySuccess_returnsPaymentUrl() {
        Cart cart = buildCartWithItem(1);

        when(cartRepository.findByUserId(USER_ID)).thenReturn(Optional.of(cart));
        when(addressRepository.findByIdAndUserId(ADDR_ID, USER_ID)).thenReturn(Optional.of(address));
        when(productRepository.findByIdForUpdate(PRODUCT_ID)).thenReturn(Optional.of(product));
        when(codeGenerator.next()).thenReturn("ORD-20260825-002");
        when(orderRepository.saveAndFlush(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));
        when(orderMapper.toDetail(any(Order.class))).thenReturn(null);
        when(vnpayService.createPaymentUrl(any(Order.class), eq("127.0.0.1")))
                .thenReturn("https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=...");

        CheckoutResponse resp = checkoutService.placeOrder(USER_ID,
                buildRequest(PaymentMethod.vnpay, null), "127.0.0.1");

        assertThat(resp.paymentUrl()).startsWith("https://sandbox.vnpayment.vn/");
        verify(vnpayService).createPaymentUrl(any(Order.class), eq("127.0.0.1"));
    }
}

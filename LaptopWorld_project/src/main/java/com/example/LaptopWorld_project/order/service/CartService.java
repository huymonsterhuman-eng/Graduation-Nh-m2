package com.example.LaptopWorld_project.order.service;

import com.example.LaptopWorld_project.catalog.entity.Product;
import com.example.LaptopWorld_project.catalog.entity.ProductImage;
import com.example.LaptopWorld_project.catalog.repository.ProductRepository;
import com.example.LaptopWorld_project.common.exception.BusinessException;
import com.example.LaptopWorld_project.common.exception.ResourceNotFoundException;
import com.example.LaptopWorld_project.order.dto.AddToCartRequest;
import com.example.LaptopWorld_project.order.dto.CartDto;
import com.example.LaptopWorld_project.order.entity.Cart;
import com.example.LaptopWorld_project.order.entity.CartItem;
import com.example.LaptopWorld_project.order.repository.CartItemRepository;
import com.example.LaptopWorld_project.order.repository.CartRepository;
import com.example.LaptopWorld_project.user.entity.User;
import com.example.LaptopWorld_project.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class CartService {

    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    // ==================== READ ====================
    @Transactional
    public CartDto getMyCart(Long userId) {
        Cart cart = getOrCreateCart(userId);
        return toDto(cart);
    }

    // ==================== ADD ITEM ====================
    @Transactional
    public CartDto addItem(Long userId, AddToCartRequest req) {
        Product product = productRepository.findById(req.productId())
                .orElseThrow(() -> new ResourceNotFoundException("Product", req.productId()));

        if (!product.isActive()) {
            throw new BusinessException("PRODUCT_INACTIVE", "Sản phẩm đang tạm ngừng bán");
        }

        Cart cart = getOrCreateCart(userId);

        Optional<CartItem> existing = cartItemRepository.findByCartIdAndProductId(cart.getId(), product.getId());
        int newQty = existing.map(CartItem::getQuantity).orElse(0) + req.quantity();

        if (newQty > product.getStock()) {
            throw new BusinessException("INSUFFICIENT_STOCK",
                    "Không đủ tồn kho. Còn " + product.getStock() + " sản phẩm.");
        }

        if (existing.isPresent()) {
            existing.get().setQuantity(newQty);
            existing.get().setPriceSnapshot(product.getEffectivePrice());
        } else {
            CartItem item = new CartItem();
            item.setProduct(product);
            item.setQuantity(req.quantity());
            item.setPriceSnapshot(product.getEffectivePrice());
            cart.addItem(item);
        }
        cartRepository.save(cart);
        return toDto(cart);
    }

    // ==================== UPDATE QUANTITY ====================
    @Transactional
    public CartDto updateItemQuantity(Long userId, Long itemId, int quantity) {
        Cart cart = getOrCreateCart(userId);
        CartItem item = cart.getItems().stream()
                .filter(i -> i.getId().equals(itemId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Item không tồn tại trong giỏ hàng của bạn"));

        Product product = item.getProduct();
        if (quantity > product.getStock()) {
            throw new BusinessException("INSUFFICIENT_STOCK",
                    "Không đủ tồn kho. Còn " + product.getStock() + " sản phẩm.");
        }
        item.setQuantity(quantity);
        item.setPriceSnapshot(product.getEffectivePrice());
        cartRepository.save(cart);
        return toDto(cart);
    }

    // ==================== REMOVE ITEM ====================
    @Transactional
    public CartDto removeItem(Long userId, Long itemId) {
        Cart cart = getOrCreateCart(userId);
        CartItem item = cart.getItems().stream()
                .filter(i -> i.getId().equals(itemId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Item không tồn tại"));
        cart.removeItem(item);
        cartRepository.save(cart);
        return toDto(cart);
    }

    // ==================== CLEAR ====================
    @Transactional
    public void clearCart(Long userId) {
        Cart cart = getOrCreateCart(userId);
        cart.getItems().clear();
        cartRepository.save(cart);
    }

    // ==================== helpers ====================
    private Cart getOrCreateCart(Long userId) {
        return cartRepository.findByUserId(userId).orElseGet(() -> {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new ResourceNotFoundException("User", userId));
            Cart c = new Cart();
            c.setUser(user);
            return cartRepository.save(c);
        });
    }

    private CartDto toDto(Cart cart) {
        List<CartDto.CartItemDto> itemDtos = cart.getItems().stream()
                .map(this::toItemDto)
                .toList();
        BigDecimal subtotal = itemDtos.stream()
                .map(CartDto.CartItemDto::lineTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        int totalQty = itemDtos.stream().mapToInt(CartDto.CartItemDto::quantity).sum();
        return new CartDto(cart.getId(), itemDtos, totalQty, subtotal, cart.getUpdatedAt());
    }

    private CartDto.CartItemDto toItemDto(CartItem item) {
        Product p = item.getProduct();
        BigDecimal currentPrice = p.getEffectivePrice();
        boolean changed = currentPrice.compareTo(item.getPriceSnapshot()) != 0;
        String primaryImg = p.getImages().stream()
                .filter(ProductImage::isPrimary)
                .map(ProductImage::getPath)
                .findFirst()
                .orElseGet(() -> p.getImages().isEmpty() ? null : p.getImages().get(0).getPath());

        return new CartDto.CartItemDto(
                item.getId(), p.getId(), p.getName(), p.getSlug(), primaryImg,
                item.getQuantity(), item.getPriceSnapshot(), currentPrice, changed,
                currentPrice.multiply(BigDecimal.valueOf(item.getQuantity())),
                p.getStock(), p.isActive()
        );
    }
}

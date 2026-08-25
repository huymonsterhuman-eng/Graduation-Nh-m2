package com.example.LaptopWorld_project.inventory;

import com.example.LaptopWorld_project.catalog.entity.Product;
import com.example.LaptopWorld_project.catalog.repository.ProductRepository;
import com.example.LaptopWorld_project.common.exception.BusinessException;
import com.example.LaptopWorld_project.inventory.dto.CreateManualIssueRequest;
import com.example.LaptopWorld_project.inventory.dto.ManualIssueItemRequest;
import com.example.LaptopWorld_project.inventory.entity.GoodsIssue;
import com.example.LaptopWorld_project.inventory.entity.GoodsIssueStatus;
import com.example.LaptopWorld_project.inventory.entity.GoodsIssueType;
import com.example.LaptopWorld_project.inventory.entity.GoodsReceiptDetail;
import com.example.LaptopWorld_project.inventory.repository.GoodsIssueRepository;
import com.example.LaptopWorld_project.inventory.repository.GoodsReceiptDetailRepository;
import com.example.LaptopWorld_project.inventory.repository.PartnerRepository;
import com.example.LaptopWorld_project.inventory.service.InventoryService;
import com.example.LaptopWorld_project.order.entity.Order;
import com.example.LaptopWorld_project.order.entity.OrderDetail;
import com.example.LaptopWorld_project.order.entity.OrderStatus;
import com.example.LaptopWorld_project.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InventoryServiceTest {

    @Mock GoodsReceiptDetailRepository goodsReceiptDetailRepository;
    @Mock GoodsIssueRepository goodsIssueRepository;
    @Mock ProductRepository productRepository;
    @Mock PartnerRepository partnerRepository;

    @InjectMocks InventoryService inventoryService;

    private Product product;
    private User author;

    @BeforeEach
    void setUp() {
        product = new Product();
        ReflectionTestUtils.setField(product, "id", 100L);
        product.setName("Laptop test");
        product.setStock(20);
        product.setReservedStock(0);

        author = new User();
        ReflectionTestUtils.setField(author, "id", 1L);
        author.setUsername("admin");
    }

    private GoodsReceiptDetail buildBatch(long id, int qtyRemaining, String importPrice) {
        GoodsReceiptDetail b = new GoodsReceiptDetail();
        ReflectionTestUtils.setField(b, "id", id);
        b.setProduct(product);
        b.setQuantity(qtyRemaining);
        b.setRemainingQuantity(qtyRemaining);
        b.setImportPrice(new BigDecimal(importPrice));
        return b;
    }

    private GoodsIssue buildPendingManualIssue() {
        GoodsIssue issue = new GoodsIssue();
        ReflectionTestUtils.setField(issue, "id", 500L);
        issue.setCode("GI-20260825-001");
        issue.setType(GoodsIssueType.manual);
        issue.setStatus(GoodsIssueStatus.pending);
        issue.setAuthor(author);
        // Manual: collect targets tu stub details
        var stub = new com.example.LaptopWorld_project.inventory.entity.GoodsIssueDetail();
        stub.setProduct(product);
        stub.setQuantity(12);
        stub.setGoodsReceiptDetail(null);
        stub.setImportPrice(BigDecimal.ZERO);
        stub.setTotalPrice(BigDecimal.ZERO);
        issue.addDetail(stub);
        return issue;
    }

    @Test
    @DisplayName("approveIssue — FIFO tru batch cu truoc + COGS tinh dung")
    void approveIssue_fifoOrder_deductsOldBatchFirst() {
        GoodsIssue issue = buildPendingManualIssue();
        // 2 batch: batch 1 cu 10 unit @ 20000, batch 2 moi 10 unit @ 22000. Xuat 12 → batch1 het + batch2 tru 2.
        List<GoodsReceiptDetail> batches = List.of(
                buildBatch(1L, 10, "20000"),
                buildBatch(2L, 10, "22000")
        );
        when(goodsIssueRepository.findWithDetailsById(500L)).thenReturn(Optional.of(issue));
        when(goodsReceiptDetailRepository.findFifoBatchesForUpdate(100L)).thenReturn(batches);
        when(goodsIssueRepository.save(any(GoodsIssue.class))).thenAnswer(inv -> inv.getArgument(0));

        GoodsIssue result = inventoryService.approveIssue(500L, author);

        // COGS = 10 * 20000 + 2 * 22000 = 244_000
        assertThat(result.getTotalCogs()).isEqualByComparingTo("244000");
        assertThat(result.getStatus()).isEqualTo(GoodsIssueStatus.completed);
        // Batch cu: het sach; batch moi: con 8
        assertThat(batches.get(0).getRemainingQuantity()).isZero();
        assertThat(batches.get(1).getRemainingQuantity()).isEqualTo(8);
        // Product.stock giam 12 (20 → 8)
        assertThat(product.getStock()).isEqualTo(8);
    }

    @Test
    @DisplayName("approveIssue — INSUFFICIENT_STOCK khi tong batch khong du")
    void approveIssue_notEnoughStock_throws() {
        GoodsIssue issue = buildPendingManualIssue(); // yeu cau 12
        List<GoodsReceiptDetail> batches = List.of(
                buildBatch(1L, 5, "20000") // chi con 5 → thieu 7
        );
        when(goodsIssueRepository.findWithDetailsById(500L)).thenReturn(Optional.of(issue));
        when(goodsReceiptDetailRepository.findFifoBatchesForUpdate(100L)).thenReturn(batches);

        assertThatThrownBy(() -> inventoryService.approveIssue(500L, author))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Không đủ tồn kho");
    }

    @Test
    @DisplayName("approveIssue — ISSUE_NOT_PENDING khi phieu da completed")
    void approveIssue_alreadyCompleted_throws() {
        GoodsIssue issue = buildPendingManualIssue();
        issue.setStatus(GoodsIssueStatus.completed);
        when(goodsIssueRepository.findWithDetailsById(500L)).thenReturn(Optional.of(issue));

        assertThatThrownBy(() -> inventoryService.approveIssue(500L, author))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("không ở trạng thái chờ duyệt");
    }

    @Test
    @DisplayName("rejectIssue — set cancelled + append reason vao note")
    void rejectIssue_setsCancelledAndAppendsReason() {
        GoodsIssue issue = buildPendingManualIssue();
        issue.setNote("Ghi chu ban dau");
        when(goodsIssueRepository.findWithDetailsById(500L)).thenReturn(Optional.of(issue));
        when(goodsIssueRepository.save(any(GoodsIssue.class))).thenAnswer(inv -> inv.getArgument(0));

        GoodsIssue result = inventoryService.rejectIssue(500L, "Hang chua ve kip");

        assertThat(result.getStatus()).isEqualTo(GoodsIssueStatus.cancelled);
        assertThat(result.getNote())
                .contains("Ghi chu ban dau")
                .contains("[Từ chối] Hang chua ve kip");
    }

    @Test
    @DisplayName("rejectIssue — auto issue tu dua order ve confirmed")
    void rejectIssue_autoIssue_revertsOrderToConfirmed() {
        GoodsIssue issue = new GoodsIssue();
        ReflectionTestUtils.setField(issue, "id", 501L);
        issue.setCode("GI-AUTO");
        issue.setType(GoodsIssueType.auto);
        issue.setStatus(GoodsIssueStatus.pending);

        Order order = new Order();
        ReflectionTestUtils.setField(order, "id", 999L);
        order.setCode("ORD-XYZ");
        order.setStatus(OrderStatus.preparing);
        issue.setOrder(order);

        when(goodsIssueRepository.findWithDetailsById(501L)).thenReturn(Optional.of(issue));
        when(goodsIssueRepository.save(any(GoodsIssue.class))).thenAnswer(inv -> inv.getArgument(0));

        inventoryService.rejectIssue(501L, null);

        assertThat(issue.getStatus()).isEqualTo(GoodsIssueStatus.cancelled);
        assertThat(order.getStatus()).isEqualTo(OrderStatus.confirmed);
    }

    @Test
    @DisplayName("createManualPendingIssue — tao phieu manual pending, khong dung kho")
    void createManualPendingIssue_createsPendingWithoutConsumingStock() {
        int stockBefore = product.getStock();
        when(productRepository.findById(100L)).thenReturn(Optional.of(product));
        when(goodsIssueRepository.countByCreatedDate(any(), any())).thenReturn(0L);
        when(goodsIssueRepository.save(any(GoodsIssue.class))).thenAnswer(inv -> inv.getArgument(0));

        CreateManualIssueRequest req = new CreateManualIssueRequest(
                "Xuat huy hang loi",
                List.of(new ManualIssueItemRequest(100L, 3))
        );

        GoodsIssue result = inventoryService.createManualPendingIssue(req, author);

        assertThat(result.getStatus()).isEqualTo(GoodsIssueStatus.pending);
        assertThat(result.getType()).isEqualTo(GoodsIssueType.manual);
        assertThat(result.getOrder()).isNull();
        assertThat(result.getDetails()).hasSize(1);
        assertThat(result.getDetails().get(0).getQuantity()).isEqualTo(3);
        assertThat(result.getDetails().get(0).getGoodsReceiptDetail()).isNull(); // stub, chua FIFO
        // Stock KHONG bi tru vi chua duyet
        assertThat(product.getStock()).isEqualTo(stockBefore);
        // Khong cham vao goodsReceiptDetailRepository
        verify(goodsReceiptDetailRepository, never()).findFifoBatchesForUpdate(any());
    }
}

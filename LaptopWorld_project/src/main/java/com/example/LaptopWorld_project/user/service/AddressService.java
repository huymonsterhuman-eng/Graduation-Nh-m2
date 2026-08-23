package com.example.LaptopWorld_project.user.service;

import com.example.LaptopWorld_project.common.exception.ResourceNotFoundException;
import com.example.LaptopWorld_project.user.dto.AddressDto;
import com.example.LaptopWorld_project.user.dto.AddressRequest;
import com.example.LaptopWorld_project.user.entity.Address;
import com.example.LaptopWorld_project.user.entity.User;
import com.example.LaptopWorld_project.user.mapper.AddressMapper;
import com.example.LaptopWorld_project.user.repository.AddressRepository;
import com.example.LaptopWorld_project.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AddressService {

    private final AddressRepository addressRepository;
    private final UserRepository userRepository;
    private final AddressMapper addressMapper;

    @Transactional(readOnly = true)
    public List<AddressDto> listMyAddresses(Long userId) {
        return addressMapper.toDtoList(
                addressRepository.findByUserIdOrderByIsDefaultDescCreatedAtDesc(userId));
    }

    @Transactional
    public AddressDto create(Long userId, AddressRequest req) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        // Xác định trước SP mới có làm default hay không
        boolean shouldBeDefault = Boolean.TRUE.equals(req.isDefault())
                || addressRepository.findByUserIdAndIsDefaultTrue(userId).isEmpty();

        // Nếu sẽ là default: unset default cũ TRƯỚC khi save entity mới
        if (shouldBeDefault) {
            unsetCurrentDefault(userId);
        }

        Address entity = new Address();
        entity.setUser(user);
        apply(entity, req);
        entity.setDefault(shouldBeDefault);
        return addressMapper.toDto(addressRepository.save(entity));
    }

    @Transactional
    public AddressDto update(Long userId, Long addressId, AddressRequest req) {
        Address entity = getOwned(userId, addressId);
        apply(entity, req);
        if (Boolean.TRUE.equals(req.isDefault()) && !entity.isDefault()) {
            unsetCurrentDefault(userId);
            entity.setDefault(true);
        }
        return addressMapper.toDto(addressRepository.save(entity));
    }

    @Transactional
    public void delete(Long userId, Long addressId) {
        Address entity = getOwned(userId, addressId);
        addressRepository.delete(entity);
    }

    @Transactional
    public AddressDto setDefault(Long userId, Long addressId) {
        Address entity = getOwned(userId, addressId);
        if (!entity.isDefault()) {
            unsetCurrentDefault(userId);
            entity.setDefault(true);
            addressRepository.save(entity);
        }
        return addressMapper.toDto(entity);
    }

    // ==================== helpers ====================
    private Address getOwned(Long userId, Long addressId) {
        return addressRepository.findByIdAndUserId(addressId, userId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Địa chỉ không tồn tại hoặc không thuộc về bạn"));
    }

    private void apply(Address a, AddressRequest req) {
        a.setName(req.name());
        a.setPhone(req.phone());
        a.setAddress(req.address());
        a.setWard(req.ward());
        a.setDistrict(req.district());
        a.setProvince(req.province());
    }

    /**
     * Bỏ cờ default của địa chỉ hiện đang là default (nếu có).
     * Tách riêng để tránh multi-instance conflict Hibernate khi loop toàn list.
     */
    private void unsetCurrentDefault(Long userId) {
        addressRepository.findByUserIdAndIsDefaultTrue(userId).ifPresent(old -> {
            old.setDefault(false);
            addressRepository.save(old);
        });
    }
}

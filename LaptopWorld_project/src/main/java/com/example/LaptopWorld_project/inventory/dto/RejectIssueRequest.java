package com.example.LaptopWorld_project.inventory.dto;

import jakarta.validation.constraints.Size;

public record RejectIssueRequest(
        @Size(max = 500, message = "Lý do từ chối tối đa 500 ký tự")
        String reason
) {}

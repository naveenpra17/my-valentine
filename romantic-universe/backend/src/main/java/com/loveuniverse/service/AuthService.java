package com.loveuniverse.service;

import com.loveuniverse.config.EntryLockProperties;
import com.loveuniverse.dto.AuthVerifyResponse;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final EntryLockProperties entryLockProperties;

    public AuthService(EntryLockProperties entryLockProperties) {
        this.entryLockProperties = entryLockProperties;
    }

    public AuthVerifyResponse verify(String answer) {
        if (!entryLockProperties.isEnabled()) {
            return new AuthVerifyResponse(true);
        }

        String expected = entryLockProperties.getAnswer();
        if (expected == null || expected.isBlank()) {
            return new AuthVerifyResponse(true);
        }

        boolean valid = expected.trim().equalsIgnoreCase(answer.trim());
        return new AuthVerifyResponse(valid);
    }
}

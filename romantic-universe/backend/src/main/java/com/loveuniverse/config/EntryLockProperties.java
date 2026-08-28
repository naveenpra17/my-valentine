package com.loveuniverse.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

@Configuration
public class EntryLockProperties {

    @Value("${app.entry-lock.enabled}")
    private boolean enabled;

    @Value("${app.entry-lock.answer}")
    private String answer;

    public boolean isEnabled() {
        return enabled;
    }

    public String getAnswer() {
        return answer;
    }
}

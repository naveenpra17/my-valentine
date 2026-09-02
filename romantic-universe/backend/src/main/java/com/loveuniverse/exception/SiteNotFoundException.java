package com.loveuniverse.exception;

public class SiteNotFoundException extends RuntimeException {
    public SiteNotFoundException(String slug) {
        super("Site not found: " + slug);
    }
}

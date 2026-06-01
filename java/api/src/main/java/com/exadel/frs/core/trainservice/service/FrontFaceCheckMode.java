package com.exadel.frs.core.trainservice.service;

import java.util.Locale;

public enum FrontFaceCheckMode {
    LENIENT,
    STRICT;

    public static FrontFaceCheckMode fromValue(final String value) {
        if (value == null || value.isBlank()) {
            return LENIENT;
        }

        final String normalized = value.trim().toUpperCase(Locale.ROOT);
        if ("LOOSE".equals(normalized)) {
            return LENIENT;
        }

        return FrontFaceCheckMode.valueOf(normalized);
    }
}

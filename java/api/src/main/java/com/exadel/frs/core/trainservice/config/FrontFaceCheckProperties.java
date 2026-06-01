package com.exadel.frs.core.trainservice.config;

import javax.validation.constraints.DecimalMin;
import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.face.front-check")
@Data
public class FrontFaceCheckProperties {

    @DecimalMin("0.0")
    private double maxYaw = 15.0;

    @DecimalMin("0.0")
    private double maxPitch = 15.0;

    @DecimalMin("0.0")
    private double maxRoll = 20.0;

    @DecimalMin("0.0")
    private double lenientMaxYaw = 89.0;

    @DecimalMin("0.0")
    private double lenientMaxPitch = 89.0;

    @DecimalMin("0.0")
    private double lenientMaxRoll = 89.0;
}

package com.exadel.frs.core.trainservice.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FrontFaceCheckThresholdsDto {

    @JsonProperty("max_yaw")
    private Double maxYaw;

    @JsonProperty("max_pitch")
    private Double maxPitch;

    @JsonProperty("max_roll")
    private Double maxRoll;
}

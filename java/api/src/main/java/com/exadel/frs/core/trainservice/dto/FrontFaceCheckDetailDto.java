package com.exadel.frs.core.trainservice.dto;

import com.exadel.frs.commonservice.dto.FacesPoseDto;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FrontFaceCheckDetailDto {

    private Boolean passed;
    private String mode;
    private FrontFaceCheckThresholdsDto thresholds;
    private FacesPoseDto actual;
    private List<String> reasons;
}

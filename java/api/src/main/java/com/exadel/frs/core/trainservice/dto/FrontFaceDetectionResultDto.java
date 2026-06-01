package com.exadel.frs.core.trainservice.dto;

import com.exadel.frs.commonservice.dto.FindFacesResultDto;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import static com.fasterxml.jackson.annotation.JsonInclude.Include.NON_NULL;

@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@JsonInclude(NON_NULL)
public class FrontFaceDetectionResultDto extends FindFacesResultDto {

    @JsonProperty("front_face_check")
    private FrontFaceCheckDetailDto frontFaceCheck;
}

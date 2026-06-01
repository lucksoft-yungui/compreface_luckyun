package com.exadel.frs.core.trainservice.dto;

import static com.fasterxml.jackson.annotation.JsonInclude.Include.NON_NULL;
import static org.apache.commons.lang3.StringUtils.isEmpty;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@JsonInclude(NON_NULL)
public class FrontFaceDetectionResponseDto extends FaceProcessResponse {

    @JsonProperty("plugins_versions")
    private PluginsVersionsDto pluginsVersions;
    private List<FrontFaceDetectionResultDto> result;

    @Override
    public FrontFaceDetectionResponseDto prepareResponse(final ProcessImageParams processImageParams) {
        if (this.getResult() == null || this.getResult().isEmpty()) {
            return this;
        }

        String facePlugins = processImageParams.getFacePlugins();
        if (isEmpty(facePlugins) || !facePlugins.contains(CALCULATOR)) {
            this.getResult().forEach(r -> r.setEmbedding(null));
        }

        if (Boolean.FALSE.equals(processImageParams.getStatus())) {
            this.setPluginsVersions(null);
            this.getResult().forEach(r -> r.setExecutionTime(null));
        }

        return this;
    }
}

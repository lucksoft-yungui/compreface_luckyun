package com.exadel.frs.core.trainservice.service;

import com.exadel.frs.commonservice.dto.FacesPoseDto;
import com.exadel.frs.commonservice.sdk.faces.FacesApiClient;
import com.exadel.frs.commonservice.sdk.faces.exception.NoFacesFoundException;
import com.exadel.frs.commonservice.sdk.faces.feign.dto.FacesPose;
import com.exadel.frs.commonservice.sdk.faces.feign.dto.FindFacesResponse;
import com.exadel.frs.commonservice.sdk.faces.feign.dto.FindFacesResult;
import com.exadel.frs.core.trainservice.config.FrontFaceCheckProperties;
import com.exadel.frs.core.trainservice.dto.FrontFaceCheckDetailDto;
import com.exadel.frs.core.trainservice.dto.FrontFaceCheckThresholdsDto;
import com.exadel.frs.core.trainservice.dto.FrontFaceDetectionResponseDto;
import com.exadel.frs.core.trainservice.dto.FrontFaceDetectionResultDto;
import com.exadel.frs.core.trainservice.dto.ProcessImageParams;
import com.exadel.frs.core.trainservice.mapper.FacesMapper;
import com.exadel.frs.core.trainservice.validation.ImageExtensionValidator;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class FrontFaceCheckService {

    private static final String POSE_PLUGIN = "pose";
    private static final String REASON_MISSING_POSE = "missing_pose";
    private static final String REASON_YAW_EXCEEDED = "yaw_exceeded";
    private static final String REASON_PITCH_EXCEEDED = "pitch_exceeded";
    private static final String REASON_ROLL_EXCEEDED = "roll_exceeded";

    private final FacesApiClient facesApiClient;
    private final ImageExtensionValidator imageExtensionValidator;
    private final FrontFaceCheckProperties properties;
    private final FacesMapper facesMapper;

    public FrontFaceDetectionResponseDto checkFrontFace(
            final MultipartFile file,
            final Integer limit,
            final Double detProbThreshold,
            final String facePlugins,
            final Boolean status,
            final FrontFaceCheckMode mode,
            final Double maxYaw,
            final Double maxPitch,
            final Double maxRoll
    ) {
        imageExtensionValidator.validate(file);
        try {
            var response = facesApiClient.findFaces(file, limit, detProbThreshold, mergeFacePlugins(facePlugins), true);
            return toResponse(response, buildProcessImageParams(file, limit, detProbThreshold, facePlugins, status), mode, maxYaw, maxPitch, maxRoll);
        } catch (NoFacesFoundException ex) {
            return FrontFaceDetectionResponseDto.builder().result(Collections.emptyList()).build();
        }
    }

    public FrontFaceDetectionResponseDto checkFrontFace(
            final String imageBase64,
            final Integer limit,
            final Double detProbThreshold,
            final String facePlugins,
            final Boolean status,
            final FrontFaceCheckMode mode,
            final Double maxYaw,
            final Double maxPitch,
            final Double maxRoll
    ) {
        imageExtensionValidator.validateBase64(imageBase64);
        try {
            var response = facesApiClient.findFacesBase64(imageBase64, limit, detProbThreshold, mergeFacePlugins(facePlugins), true);
            return toResponse(response, buildProcessImageParams(imageBase64, limit, detProbThreshold, facePlugins, status), mode, maxYaw, maxPitch, maxRoll);
        } catch (NoFacesFoundException ex) {
            return FrontFaceDetectionResponseDto.builder().result(Collections.emptyList()).build();
        }
    }

    private FrontFaceDetectionResponseDto toResponse(
            final FindFacesResponse response,
            final ProcessImageParams processImageParams,
            final FrontFaceCheckMode mode,
            final Double maxYaw,
            final Double maxPitch,
            final Double maxRoll
    ) {
        if (response == null || response.getResult() == null || response.getResult().isEmpty()) {
            return FrontFaceDetectionResponseDto.builder().result(Collections.emptyList()).build();
        }

        final double resolvedMaxYaw = resolveMaxYaw(mode, maxYaw);
        final double resolvedMaxPitch = resolveMaxPitch(mode, maxPitch);
        final double resolvedMaxRoll = resolveMaxRoll(mode, maxRoll);

        final FrontFaceCheckThresholdsDto thresholds = FrontFaceCheckThresholdsDto.builder()
                .maxYaw(resolvedMaxYaw)
                .maxPitch(resolvedMaxPitch)
                .maxRoll(resolvedMaxRoll)
                .build();

        final var mappedResponse = facesMapper.toFacesDetectionResponseDto(response);
        final List<FrontFaceDetectionResultDto> results = new ArrayList<>();
        for (int i = 0; i < response.getResult().size(); i++) {
            results.add(toFrontFaceResult(mappedResponse.getResult().get(i), response.getResult().get(i), mode, thresholds));
        }

        return FrontFaceDetectionResponseDto.builder()
                .pluginsVersions(mappedResponse.getPluginsVersions())
                .result(results)
                .build()
                .prepareResponse(processImageParams);
    }

    private FrontFaceDetectionResultDto toFrontFaceResult(
            final com.exadel.frs.commonservice.dto.FindFacesResultDto mapped,
            final FindFacesResult face,
            final FrontFaceCheckMode mode,
            final FrontFaceCheckThresholdsDto thresholds
    ) {
        final FrontFaceDetectionResultDto result = new FrontFaceDetectionResultDto();
        result.setAge(mapped.getAge());
        result.setGender(mapped.getGender());
        result.setPose(mapped.getPose());
        result.setEmbedding(mapped.getEmbedding());
        result.setBox(mapped.getBox());
        result.setExecutionTime(mapped.getExecutionTime());
        result.setLandmarks(mapped.getLandmarks());
        result.setMask(mapped.getMask());
        result.setFrontFaceCheck(buildFrontFaceCheck(face.getPose(), mode, thresholds));
        return result;
    }

    private FrontFaceCheckDetailDto buildFrontFaceCheck(
            final FacesPose pose,
            final FrontFaceCheckMode mode,
            final FrontFaceCheckThresholdsDto thresholds
    ) {
        final List<String> reasons = collectReasons(pose, thresholds);
        return FrontFaceCheckDetailDto.builder()
                .passed(reasons.isEmpty())
                .mode(mode.name().toLowerCase())
                .thresholds(thresholds)
                .actual(toPoseDto(pose))
                .reasons(reasons)
                .build();
    }

    private List<String> collectReasons(final FacesPose pose, final FrontFaceCheckThresholdsDto thresholds) {
        if (pose == null) {
            return List.of(REASON_MISSING_POSE);
        }

        final List<String> reasons = new ArrayList<>();
        if (abs(pose.getYaw()) > thresholds.getMaxYaw()) {
            reasons.add(REASON_YAW_EXCEEDED);
        }
        if (abs(pose.getPitch()) > thresholds.getMaxPitch()) {
            reasons.add(REASON_PITCH_EXCEEDED);
        }
        if (abs(pose.getRoll()) > thresholds.getMaxRoll()) {
            reasons.add(REASON_ROLL_EXCEEDED);
        }
        return reasons;
    }

    private FacesPoseDto toPoseDto(final FacesPose pose) {
        if (pose == null) {
            return null;
        }
        return new FacesPoseDto()
                .setYaw(pose.getYaw())
                .setPitch(pose.getPitch())
                .setRoll(pose.getRoll());
    }

    private ProcessImageParams buildProcessImageParams(
            final MultipartFile file,
            final Integer limit,
            final Double detProbThreshold,
            final String facePlugins,
            final Boolean status
    ) {
        return ProcessImageParams.builder()
                .file(file)
                .limit(limit)
                .detProbThreshold(detProbThreshold)
                .facePlugins(facePlugins)
                .status(status)
                .build();
    }

    private ProcessImageParams buildProcessImageParams(
            final String imageBase64,
            final Integer limit,
            final Double detProbThreshold,
            final String facePlugins,
            final Boolean status
    ) {
        return ProcessImageParams.builder()
                .imageBase64(imageBase64)
                .limit(limit)
                .detProbThreshold(detProbThreshold)
                .facePlugins(facePlugins)
                .status(status)
                .build();
    }

    private String mergeFacePlugins(final String facePlugins) {
        final Set<String> plugins = new LinkedHashSet<>();
        if (facePlugins != null && !facePlugins.isBlank()) {
            Arrays.stream(facePlugins.split(","))
                    .map(String::trim)
                    .filter(value -> !value.isEmpty())
                    .forEach(plugins::add);
        }
        plugins.add(POSE_PLUGIN);
        return String.join(",", plugins);
    }

    private double resolveMaxYaw(final FrontFaceCheckMode mode, final Double maxYaw) {
        if (maxYaw != null) {
            return maxYaw;
        }
        return FrontFaceCheckMode.STRICT == mode ? properties.getMaxYaw() : properties.getLenientMaxYaw();
    }

    private double resolveMaxPitch(final FrontFaceCheckMode mode, final Double maxPitch) {
        if (maxPitch != null) {
            return maxPitch;
        }
        return FrontFaceCheckMode.STRICT == mode ? properties.getMaxPitch() : properties.getLenientMaxPitch();
    }

    private double resolveMaxRoll(final FrontFaceCheckMode mode, final Double maxRoll) {
        if (maxRoll != null) {
            return maxRoll;
        }
        return FrontFaceCheckMode.STRICT == mode ? properties.getMaxRoll() : properties.getLenientMaxRoll();
    }

    private double abs(final Double value) {
        return value == null ? Double.MAX_VALUE : Math.abs(value);
    }
}

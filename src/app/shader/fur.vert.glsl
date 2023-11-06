uniform vec4 shellParams;

out vec2 vUv;
out float vShellProgress;

void main() {
    float shellIndex = float(gl_InstanceID);

    // decompose shell parameters
    float shellCount = shellParams.x;
    float shellThickness = shellParams.y;

    // offset the shell instance
    float shellLayerThickness = shellThickness / shellCount;
    vec3 shellOffset = normal * shellIndex * shellLayerThickness;
    vec3 pos = position + shellOffset;

    vec4 instancePosition = instanceMatrix * vec4(pos, 1.0);
    vec4 worldPosition = modelMatrix * instancePosition;
    vec4 viewPosition = viewMatrix * worldPosition;
    csm_PositionRaw = projectionMatrix * viewPosition;

    vUv = uv;
    vShellProgress = shellIndex / shellCount;
}

out vec2 vUv;
out vec3 vNormal;
out vec3 vWorldPosition;
flat out vec3 vFlatNormal;

void main() {
    vec4 instancePosition = instanceMatrix * vec4(position, 1.0);
    vec4 worldPosition = modelMatrix * instancePosition;
    vec4 viewPosition = viewMatrix * worldPosition;
    gl_Position = projectionMatrix * viewPosition;

    vNormal = normalMatrix * normal;
    vFlatNormal = vNormal;
    vWorldPosition = worldPosition.xyz;
}

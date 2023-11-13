uniform vec4 shellParams;
uniform sampler2D normalMapTexture;

out vec3 vPosition;
out vec3 vNormal;
out vec3 vTangent;
out vec2 vUv;
out float vShellProgress;
out mat3 vNormalMatrix;
out float vDisplace;

#include "./util/xyz2octahedron.glsl";
#include "./util/orthogonal.glsl";

void main() {
    float shellIndex = float(gl_InstanceID);

    // get the displacment from the normal maps alpha channel
    vec3 sn = normal;
    vec2 st = xyz2octahedron(sn, 0.001);
    float displace = texture(normalMapTexture, st).a;
    vec3 pos = position + normal * displace * 0.08;

    // decompose shell parameters
    float shellCount = shellParams.x;
    float shellThickness = shellParams.y;

    // offset the shell instance
    float shellLayerThickness = shellThickness / shellCount;
    vec3 shellOffset = normal * shellIndex * shellLayerThickness;
    pos += shellOffset;

    vec4 instancePosition = instanceMatrix * vec4(pos, 1.0);
    vec4 worldPosition = modelMatrix * instancePosition;
    vec4 viewPosition = viewMatrix * worldPosition;
    gl_Position = projectionMatrix * viewPosition;

    vPosition = position;
    vNormal = normal;
    vTangent = normalize(cross(vec3(0., 1., 0.), normal));
    vUv = uv;
    vShellProgress = shellIndex / shellCount;
    vNormalMatrix = normalMatrix;
    vDisplace = displace;
}

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

float rand(vec2 n) { 
	return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
}

float noise(vec2 p){
	vec2 ip = floor(p);
	vec2 u = fract(p);
	u = u*u*(3.0-2.0*u);
	
	float res = mix(
		mix(rand(ip),rand(ip+vec2(1.0,0.0)),u.x),
		mix(rand(ip+vec2(0.0,1.0)),rand(ip+vec2(1.0,1.0)),u.x),u.y);
	return res*res;
}

void main() {
    float shellIndex = float(gl_InstanceID);
    float noiseDisp = noise(uv * shellIndex * 200.);

    // get the displacment from the normal maps alpha channel
    vec3 sn = normal;
    vec2 st = xyz2octahedron(sn, 0.001);
    vec4 normalTex = texture(normalMapTexture, st);
    float displace = normalTex.a;
    vec3 pos = position + normal * displace * 0.08;
    pos += normal * noiseDisp * .005;

    // decompose shell parameters
    float shellCount = shellParams.x;
    float shellThickness = shellParams.y;

    // offset the shell instance
    float shellLayerThickness = shellThickness / shellCount;
    vec3 shellOffset = normalTex.xyz * (shellIndex * shellLayerThickness - shellLayerThickness * shellCount * .5);
    shellOffset *= displace * 0.5 + 1.;
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

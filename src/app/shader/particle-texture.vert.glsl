in vec4 position;

uniform int textureSize;

out vec4 vParticle;

void main() {
    vec2 texelSize = 1. / vec2(float(textureSize));
    int y = gl_VertexID / textureSize;
    int x = gl_VertexID % textureSize;
    vec2 pos = vec2(float(x), float(y));
    pos += texelSize * 0.5;
    pos /= float(textureSize);
    pos = pos * 2. - 1.;

    vParticle = position;

    gl_Position = vec4(pos, 0., 1.);
}

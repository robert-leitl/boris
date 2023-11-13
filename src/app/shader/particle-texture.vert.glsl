in vec4 position;

uniform int textureSize;

out vec4 vParticle;

void main() {
    vec2 texelSize = 1. / vec2(float(textureSize));

    // the position is defined by the vertex=particle id
    int y = gl_VertexID / textureSize;
    int x = gl_VertexID % textureSize;
    vec2 pos = vec2(float(x), float(y));

    pos /= float(textureSize);
    // center within a pixel
    pos += texelSize * 0.5;
    // ndc
    pos = pos * 2. - 1.;

    vParticle = position;

    gl_Position = vec4(pos, 0., 1.);
}

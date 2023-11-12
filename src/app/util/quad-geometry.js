import {BufferGeometry, Float32BufferAttribute} from 'three';

export class QuadGeometry extends BufferGeometry {

    static vertexShader = `
    out vec2 vUv;

    void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0., 1.);
    }
    `;

    constructor() {
        super();

        this.setAttribute( 'position', new Float32BufferAttribute( [ - 1, 3, 0, - 1, - 1, 0, 3, - 1, 0 ], 3 ) );
        this.setAttribute( 'uv', new Float32BufferAttribute( [ 0, 2, 0, 0, 2, 0 ], 2 ) );
    }
}

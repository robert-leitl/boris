import { quat, vec3, vec2, mat3 } from 'gl-matrix';
import { Quaternion, Vector2, Vector3 } from 'three';

export class ArcballControl {

    // flag which indicates if the user is currently dragging
    isPointerDown = false;

    // this quarternion describes the current orientation of the object
    orientation = new Quaternion();

    // the current pointer rotation as a quarternion
    pointerRotation = new Quaternion();

    // the velocity of the rotation
    rotationVelocity = 0;

    // the axis of the rotation
    rotationAxis = new Vector3(1, 0, 0);

    // the direction to move the snap target to (in world space)
    snapDirection = new Vector3(0, 0, 1);

    // the direction of the target to move to the snap direction (in world space)
    snapTargetDirection;

    EPSILON = 0.1;
    IDENTITY_QUAT = new Quaternion();

    constructor(canvas, updateCallback) {
        this.canvas = canvas;
        this.updateCallback = updateCallback ? updateCallback : () => null;

        this.isPointerDown = false;
        this.pointerPos = new Vector2();
        this.previousPointerPos = new Vector2();
        this._rotationVelocity = 0;    // smooth rotational velocity
        this._combinedQuat = new Quaternion();     // to smooth out the rotational axis

        canvas.addEventListener('pointerdown', e => {
            this.pointerPos = new Vector2(e.clientX, e.clientY);
            this.previousPointerPos = new Vector2(e.clientX, e.clientY);
            this.isPointerDown = true;
        });
        canvas.addEventListener('pointerup', e => {
            this.isPointerDown = false;
        });
        canvas.addEventListener('pointerleave', e => {
            this.isPointerDown = false;
        });
        canvas.addEventListener('pointermove', e => {
            if (this.isPointerDown) {
                this.pointerPos.set(e.clientX, e.clientY);
            }
        });

        // disable native touch handling
        canvas.style.touchAction = 'none';
    }

    update(deltaTime, targetFrameDuration = 16) {
        const timeScale = deltaTime / targetFrameDuration + 0.00001;

        let angleFactor = timeScale;
        let snapRotation = new Quaternion();

        if (this.isPointerDown) {
            // the intensity of the pointer to reach the new position (lower value --> slower movement)
            const INTENSITY = 0.1 * timeScale;
            // the factor to amplify the rotation angle (higher value --> faster rotation)
            const ANGLE_AMPLIFICATION = 10 / timeScale;

            // get only a part of the pointer movement to smooth out the movement
            const midPointerPos = (new Vector2()).subVectors(this.pointerPos, this.previousPointerPos);
            midPointerPos.multiplyScalar(INTENSITY);

            if (midPointerPos.lengthSq() > this.EPSILON) {
                midPointerPos.add(this.previousPointerPos);

                // get points on the arcball and corresponding normals
                const p = this.#project(midPointerPos);
                const q = this.#project(this.previousPointerPos);
                const a = p.clone().normalize();
                const b = q.clone().normalize();
    
                // copy for the next iteration
                this.previousPointerPos.copy(midPointerPos);
    
                // scroll faster
                angleFactor *= ANGLE_AMPLIFICATION;
    
                // get the new rotation quat
                this.quatFromVectors(a, b, this.pointerRotation, angleFactor);
            } else {
                this.pointerRotation.slerp(this.IDENTITY_QUAT, INTENSITY);
            }
        } else {
            // the intensity of the continuation for the pointer rotation (lower --> longer continuation)
            const INTENSITY = 0.1 * timeScale;

            // decrement the pointer rotation smoothly to the identity quaternion
            this.pointerRotation.slerp(this.IDENTITY_QUAT, INTENSITY);

            if (this.snapTargetDirection) {
                // defines the strength of snapping rotation (lower --> less strong)
                const INTENSITY = 0.2;

                const a = this.snapTargetDirection
                const b = this.snapDirection;
    
                // smooth out the snapping by damping the effect of farther away points
                const sqrDist = a.distanceToSquared(b);
                const distanceFactor =  Math.max(0.1, 1 - sqrDist * 10);
    
                // slow down snapping
                angleFactor *= INTENSITY * distanceFactor;
    
                this.quatFromVectors(a, b, snapRotation, angleFactor);
            }
        }

        // combine the pointer rotation with the snap rotation and add it to the orientation
        const combinedQuat = (new Quaternion()).multiplyQuaternions(snapRotation, this.pointerRotation);
        this.orientation = (new Quaternion()).multiplyQuaternions(combinedQuat, this.orientation);
        this.orientation.normalize();

        // the intensity of the rotation axis changes to reach the new axis (lower value --> slower movement)
        const RA_INTENSITY = .8 * timeScale;

        // smooth out the combined rotation axis
        this._combinedQuat.slerp(combinedQuat, RA_INTENSITY);
        this._combinedQuat.normalize();

        // the intensity of the rotation angel to reach the new angel (lower value --> slower movement)
        const RV_INTENSITY = 0.5 * timeScale;

        // check if there is a significant change in rotation, otherwise
        // getAxisAngle will return an arbitrary fixed axis which will result
        // in jumps during the animation
        const rad = Math.acos(this._combinedQuat.w) * 2.0;
        const s = Math.sin(rad / 2.0);
        let rv = 0;
        if (s > 0.000001) {
            // calculate the rotation axis and velocity from the combined rotation
            // --> quat.getAxisAngle(this.rotationAxis, this._combinedQuat) / (2 * Math.PI);
            rv = rad / (2 * Math.PI);
            this.rotationAxis.x = this._combinedQuat.x / s;
            this.rotationAxis.y = this._combinedQuat.y / s;
            this.rotationAxis.z = this._combinedQuat.z / s;
        }

        // smooth out the velocity
        this._rotationVelocity += (rv - this._rotationVelocity) * RV_INTENSITY;
        this.rotationVelocity = this._rotationVelocity / timeScale;

        this.updateCallback(deltaTime);
    }

    quatFromVectors(a, b, out, angleFactor = 1) {
        // get the normalized axis of rotation
        const axis = (new Vector3()).crossVectors(a, b);
        axis.normalize();

        // get the amount of rotation
        const d = Math.max(-1, Math.min(1, a.dot(b)));
        const angle = Math.acos(d) * angleFactor;

        // return the new rotation quat
        return { q: out.setFromAxisAngle(axis, angle), axis, angle };
    }

    /**
     * Maps pointer coordinates to canonical coordinates [-1, 1] 
     * and projects them onto the arcball surface or onto a 
     * hyperbolical function outside the arcball.
     * 
     * @return vec3 The arcball coords
     * 
     * @see https://www.xarg.org/2021/07/trackball-rotation-using-quaternions/
     */
    #project(pos) {
        const r = 2; // arcball radius
        const w = this.canvas.clientWidth;
        const h = this.canvas.clientHeight;
        const s = Math.max(w, h) - 1;

        // map to -1 to 1
        const x = (2 * pos.x - w - 1) / s;
        const y = (2 * pos.y - h - 1) / s;
        let z = 0;
        const xySq = x * x + y * y;
        const rSq = r * r;

        if (xySq <= rSq / 2)
            z = Math.sqrt(rSq - xySq);
        else
            z = (rSq / 2) / Math.sqrt(xySq); // hyperbolical function

        return new Vector3(-x, y, z);
    }
}
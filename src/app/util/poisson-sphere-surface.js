import { Box3, Vector3 } from "three";
import { randomInRange } from "./random-in-range";

/**
 * Generates points on the surface of a sphere using possion disk sampling.
 * 
 * @see https://www.cs.ubc.ca/~rbridson/docs/bridson-siggraph07-poissondisk.pdf
 */
export class PoissonSphereSurface {

    // limit of samples to choose before rejection
    k = 60;

    constructor(sphereRadius, radius) {
        this.sphereRadius = sphereRadius;
        this.radius = radius; 
        this.sphereCenter = new Vector3(sphereRadius, sphereRadius, sphereRadius);
        this.boxSize = this.sphereCenter.clone().multiplyScalar(2);
        this.box = new Box3(
            new Vector3(),
            this.boxSize.clone()
        );
        // diagonal of cube with side length radius
        this.cellSize = radius / Math.sqrt(3);
        this.gridSize = this.boxSize.clone().divideScalar(this.cellSize).floor();
    }

    generateSamples() {
        const grid = new Array(this.gridSize.x * this.gridSize.y * this.gridSize.z);

        // find initial sample
        let p = new Vector3().randomDirection().multiplyScalar(this.sphereRadius).add(this.sphereCenter);
        grid[this.getIndex(this.getIndices(p))] = p;
        const active = [p];

        // generate samples
        while(active.length > 0) {
            const randIndex = Math.floor(Math.random() * active.length);
            p = active[randIndex];

            // find new sample
            let foundValidSample = false;
            for(let i=0; i<this.k; ++i) {
                // create test sample
                const offset = (new Vector3()).randomDirection().multiplyScalar(randomInRange(this.radius, 2 * this.radius));
                const sample = p.clone().add(offset);
                sample.sub(this.sphereCenter).setLength(this.sphereRadius).add(this.sphereCenter);
                const sampleIndices = this.getIndices(sample);
                const sampleIndex = this.getIndex(sampleIndices);

                // check if sample is within box volume
                if (!this.box.containsPoint(sample)) continue;

                // check if sample is valid
                let isValidSample = true;
                for(let ix=-1; ix<=1 && isValidSample; ++ix) {
                    for(let iy=-1; iy<=1 && isValidSample; ++iy) {
                        for(let iz=-1; iz<=1 && isValidSample; ++iz) {
                            const neighborIndices = sampleIndices.clone().add(new Vector3(ix, iy, iz));

                            // check for bounds
                            if (neighborIndices.x < 0 || neighborIndices.y < 0 || neighborIndices.z < 0 || neighborIndices.x > this.gridSize.x || neighborIndices.y > this.gridSize.y || neighborIndices.z > this.gridSize.z) {
                                continue;
                            }

                            // check if within minimal distance
                            const neighbor = grid[this.getIndex(neighborIndices)];
                            if (neighbor && sample.distanceTo(neighbor) < this.radius) {
                                isValidSample = false;
                            }
                        }
                    }
                }

                if (isValidSample) {
                    // add the sample to the grid and active list
                    grid[sampleIndex] = sample;
                    active.push(sample);
                    foundValidSample = true;
                }
            }

            if (!foundValidSample) {
                active.splice(randIndex, 1);
            }
        }

        return grid.filter(s => s !== null).map(s => s.sub(this.sphereCenter));
    }

    getIndices(p) {
        return p.clone().divideScalar(this.cellSize).floor();
    }

    getIndex(indices) {
        return indices.x + indices.y * this.gridSize.x + indices.z * this.gridSize.x * this.gridSize.y;
    }
}
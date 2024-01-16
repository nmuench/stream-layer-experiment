import { project } from "@arcgis/core/geometry/projection.js";
import WebSocket from "ws";
import Point from "@arcgis/core/geometry/Point.js";
/**
 * MockService that will output either point or polygon features with a geometry and
 * two attributes - a TRACKID and OBJECTID
 */
const BROADCAST_INTERVAL = 1000;
const websocketUrl = "wss://dev-ws-connect.flocksafety.com/?auth=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IlFqYzFNVUkzUlVORU16WTVSVUpDTmtVME5VRTFNVUk1T0RrNU9EZEdOME5HTWtZME5FRXpRUSJ9.eyJodHRwczovL2Zsb2Nrc2FmZXR5LmNvbS9leHRlcm5hbF9pZCI6ImY2ZDdjZGFhLTIwZDItNGFhNy1iNDliLWRlZTczMzI3NzA2NyIsImh0dHBzOi8vZmxvY2tzYWZldHkuY29tL29yZ2FuaXphdGlvbl9pZCI6IjM3Mjg3NzA1LWVlNDEtNGQ2YS05NDFiLTY3ZTM0YTcyNTZiNSIsImh0dHBzOi8vZmxvY2tzYWZldHkuY29tL2VtYWlsIjoibmljay5tdWVuY2hlbitmbG9ja2VuZ0BmbG9ja3NhZmV0eS5jb20iLCJodHRwczovL2Zsb2Nrc2FmZXR5LmNvbS9uYW1lIjoiTmljayBNdWVuY2hlbiIsImh0dHBzOi8vZmxvY2tzYWZldHkuY29tL3RpbWV6b25lIjoiVVMvQ2VudHJhbCIsImlzcyI6Imh0dHBzOi8vZGV2LWxvZ2luLmZsb2Nrc2FmZXR5LmNvbS8iLCJzdWIiOiJhdXRoMHw2NDY0ZTM1Yjc4NDcwNzAyYjQ3YjVhMTEiLCJhdWQiOlsiY29tLmZsb2Nrc2FmZXR5Lm1lcmxvdC5kZXYiLCJodHRwczovL2Rldi1mbG9jay5hdXRoMC5jb20vdXNlcmluZm8iXSwiaWF0IjoxNzA1NDIwMjYzLCJleHAiOjE3MDU1MDY2NjMsImF6cCI6IjA2c2NBckJrNEIxVGdEczdPRGhFeVA3N3E0VHo0Nk1uIiwic2NvcGUiOiJvcGVuaWQgcHJvZmlsZSBlbWFpbCJ9.YNNVOzX66QorDweQRtEMrorht9kdp9_4QVgtDE2n1Ar1fgMsK-Ro8SbwTOA01L_SNtZrbubI_QlCNz116SzdsErJyBxxAlJllgOs8nJ0H99H_cCz9gmRv8ymv9lydMiE4im0IKn0qqgxTF8_i6E0sGg-0TSkenKRqdaJeb5hB7E-CBjBNs2nhftxW9Kg-dT2f5rQr-1i-oGq7JBMe9WmoP4IGqlLPhWFiyEldZK6j4PP2zCLeucCMqH0lUcHEonTXxLx5e95lPYEIGCMHP19RUZmIcG7TTYT8z_H0jXy5iHTheXVLjArEZ7MMG83vsjw19zHY4DgykexrhQPLEnw4w";
export class MockService {
    constructor() {
        this._idCounter = 0x1;
        this.lastObservations = [];
    }
    initialize(points, updateCallback) {
        this.websocketConnection = new WebSocket(websocketUrl);
        this.websocketConnection.on("open", () => console.log("Connection"));
        this.websocketConnection.on("message", (ev) => {
            const msg = JSON.parse(ev);
            if (msg) {
                if (msg.messageType && msg.messageType === "batch") {
                    const vehicles = msg.messages.filter((m) => m.messageType === "vehicle");
                    if (vehicles && vehicles.length > 0) {
                        this.updatePositions(vehicles);
                    }
                }
            }
        });
        this.updateCallback = updateCallback;
    }
    updatePositions(vehiclesToUpdate) {
        const updatedSet = new Set(vehiclesToUpdate.map((v) => v.subject.id));
        this.lastObservations.filter((v) => !updatedSet.has(v.attributes.id));
        for (const v of vehiclesToUpdate) {
            const point = project(new Point({
                latitude: v.location.coordinates.latitude,
                longitude: v.location.coordinates.longitude,
            }), {
                wkid: 102100,
            });
            const attributes = {
                id: v.subject.id,
                OBJECTID: this._createId(),
            };
            const newObs = {
                attributes,
                geometry: {
                    x: point.x,
                    y: point.y,
                },
            };
            this.lastObservations.push(newObs);
        }
        const outFeatures = [];
        for (let i = 0; i < this.lastObservations.length; i++) {
            const { attributes, geometry } = this.lastObservations[i];
            outFeatures.push({ attributes: { ...attributes, OBJECTID: this._createId() }, geometry });
        }
        const features = JSON.stringify({
            type: "featureResult",
            features: outFeatures,
        });
        this.updateCallback(features);
    }
    _createId() {
        const id = this._idCounter;
        this._idCounter = (this._idCounter + 1) % 0xfffffffe; // force nonzero u32
        return id;
    }
}
//# sourceMappingURL=MockService.js.map
import { project } from "@arcgis/core/geometry/projection.js";
import WebSocket from "ws";
import Point from "@arcgis/core/geometry/Point.js";
interface Feature {
  attributes: any;
  geometry: {
    x: number;
    y: number;
  };
}

/**
 * MockService that will output either point or polygon features with a geometry and
 * two attributes - a TRACKID and OBJECTID
 */
const BROADCAST_INTERVAL = 1000;

const websocketUrl = /* Add websocket URL here */ '';

export class MockService {
  private websocketConnection: WebSocket;
  constructor() {}

  private _idCounter = 0x1;
  private lastObservations: Array<Feature> = [];
  private updateCallback: (stringFeatures: string) => void;

  initialize(
    points: Array<{ latitude: number; longitude: number }>,
    updateCallback: (stringFeatures: string) => void
  ): void {
    this.websocketConnection = new WebSocket(websocketUrl);
    this.websocketConnection.on("open", () => console.log("Connection"));
    this.websocketConnection.on("message", (ev: any) => {
      const msg = JSON.parse(ev);
      if (msg) {
        if (msg.messageType && msg.messageType === "batch") {
          const vehicles = msg.messages.filter(
            (m: any) => m.messageType === "vehicle"
          );
          if (vehicles && vehicles.length > 0) {
            this.updatePositions(vehicles);
          }
        }
      }
    });
    this.updateCallback = updateCallback;
  }


  private updatePositions(vehiclesToUpdate: any[]): void {
    const updatedSet = new Set(vehiclesToUpdate.map((v) => v.subject.id));
    this.lastObservations.filter((v) => !updatedSet.has(v.attributes.id));
    for (const v of vehiclesToUpdate) {
      const point = project(
        new Point({
          latitude: v.location.coordinates.latitude,
          longitude: v.location.coordinates.longitude,
        }),
        {
          wkid: 102100,
        }
      ) as Point;
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

    const outFeatures: Array<any> = [];

    for (let i = 0; i < this.lastObservations.length; i++) {
      const { attributes, geometry} = this.lastObservations[i];
      outFeatures.push({ attributes: { ...attributes, OBJECTID: this._createId()}, geometry});
    }

    const features = JSON.stringify({
      type: "featureResult",
      features: outFeatures,
    });

    this.updateCallback(features);
  }

  private _createId(): number {
    const id = this._idCounter;

    this._idCounter = (this._idCounter + 1) % 0xfffffffe; // force nonzero u32
    return id;
  }
}

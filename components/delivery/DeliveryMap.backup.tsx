"use client";

import { useEffect, useMemo } from "react";

import L from "leaflet";

import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";

export type DeliveryMapPosition = {
  latitude: number;
  longitude: number;
};

export type DeliveryMapOrder = {
  id: number;
  order_number: string;
  customer_name: string;
  phone: string;
  street_address: string;
  postal_code: string;
  city: string;
  status: string;
  latitude: number | null;
  longitude: number | null;
  route_position: number | null;
};

type DeliveryMapProps = {
  orders: DeliveryMapOrder[];
  selectedOrderId: number | null;
  selectedRouteOrderIds: number[];
  startPosition: DeliveryMapPosition | null;
  onSelectOrder: (orderId: number) => void;
  onPlaceOrder: (
    orderId: number,
    latitude: number,
    longitude: number,
  ) => void | Promise<void>;
};

const DEFAULT_CENTER: [number, number] = [
  57.3167,
  14.6,
];

const DEFAULT_ZOOM = 8;

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function createDeliveryIcon(
  routePosition: number | null,
  selectedForRoute: boolean,
  selectedForPlacement: boolean,
) {
  const label =
    routePosition !== null
      ? String(routePosition)
      : "•";

  let background = "#29231f";
  let border = "#fff3df";

  if (selectedForRoute) {
    background = "#ef6a27";
  }

  if (selectedForPlacement) {
    background = "#b53b2f";
    border = "#ffffff";
  }

  return L.divIcon({
    className: "delivery-custom-marker",
    html: `
      <div
        style="
          width: 40px;
          height: 40px;
          display: grid;
          place-items: center;
          border: 3px solid ${border};
          border-radius: 50% 50% 50% 9px;
          background: ${background};
          color: #ffffff;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 14px;
          font-weight: 900;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.42);
          transform: rotate(-45deg);
        "
      >
        <span
          style="
            display: block;
            transform: rotate(45deg);
          "
        >
          ${escapeHtml(label)}
        </span>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -41],
  });
}

function createStartIcon() {
  return L.divIcon({
    className: "delivery-start-marker",
    html: `
      <div
        style="
          width: 44px;
          height: 44px;
          display: grid;
          place-items: center;
          border: 3px solid #ffffff;
          border-radius: 50%;
          background: #28733b;
          color: #ffffff;
          font-size: 21px;
          box-shadow: 0 8px 22px rgba(0, 0, 0, 0.42);
        "
      >
        🚚
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -25],
  });
}

function MapClickHandler({
  selectedOrderId,
  onPlaceOrder,
}: {
  selectedOrderId: number | null;
  onPlaceOrder: (
    orderId: number,
    latitude: number,
    longitude: number,
  ) => void | Promise<void>;
}) {
  useMapEvents({
    click(event) {
      if (selectedOrderId === null) {
        return;
      }

      void onPlaceOrder(
        selectedOrderId,
        event.latlng.lat,
        event.latlng.lng,
      );
    },
  });

  return null;
}

function MapCursorController({
  selectedOrderId,
}: {
  selectedOrderId: number | null;
}) {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();

    if (selectedOrderId !== null) {
      container.style.cursor = "crosshair";
    } else {
      container.style.cursor = "";
    }

    return () => {
      container.style.cursor = "";
    };
  }, [map, selectedOrderId]);

  return null;
}

function FitMapToPositions({
  orders,
  startPosition,
}: {
  orders: DeliveryMapOrder[];
  startPosition: DeliveryMapPosition | null;
}) {
  const map = useMap();

  useEffect(() => {
    const positions: [number, number][] =
      orders
        .filter(
          (order) =>
            order.latitude !== null &&
            order.longitude !== null &&
            Number.isFinite(
              Number(order.latitude),
            ) &&
            Number.isFinite(
              Number(order.longitude),
            ),
        )
        .map((order) => [
          Number(order.latitude),
          Number(order.longitude),
        ]);

    if (startPosition) {
      positions.push([
        startPosition.latitude,
        startPosition.longitude,
      ]);
    }

    if (positions.length === 0) {
      map.setView(
        DEFAULT_CENTER,
        DEFAULT_ZOOM,
      );

      return;
    }

    if (positions.length === 1) {
      map.setView(positions[0], 13);

      return;
    }

    const bounds = L.latLngBounds(positions);

    map.fitBounds(bounds, {
      padding: [55, 55],
      maxZoom: 14,
    });
  }, [map, orders, startPosition]);

  return null;
}

function InvalidateMapSize() {
  const map = useMap();

  useEffect(() => {
    const updateMapSize = () => {
      map.invalidateSize();
    };

    const firstTimer = window.setTimeout(
      updateMapSize,
      100,
    );

    const secondTimer = window.setTimeout(
      updateMapSize,
      600,
    );

    window.addEventListener(
      "resize",
      updateMapSize,
    );

    return () => {
      window.clearTimeout(firstTimer);
      window.clearTimeout(secondTimer);

      window.removeEventListener(
        "resize",
        updateMapSize,
      );
    };
  }, [map]);

  return null;
}

export default function DeliveryMap({
  orders,
  selectedOrderId,
  selectedRouteOrderIds,
  startPosition,
  onSelectOrder,
  onPlaceOrder,
}: DeliveryMapProps) {
  const positionedOrders = useMemo(() => {
    return orders.filter(
      (order) =>
        order.latitude !== null &&
        order.longitude !== null &&
        Number.isFinite(
          Number(order.latitude),
        ) &&
        Number.isFinite(
          Number(order.longitude),
        ),
    );
  }, [orders]);

  const routeOrders = useMemo(() => {
    return positionedOrders
      .filter((order) =>
        selectedRouteOrderIds.includes(
          order.id,
        ),
      )
      .sort((firstOrder, secondOrder) => {
        const firstPosition =
          firstOrder.route_position ??
          Number.MAX_SAFE_INTEGER;

        const secondPosition =
          secondOrder.route_position ??
          Number.MAX_SAFE_INTEGER;

        return firstPosition - secondPosition;
      });
  }, [
    positionedOrders,
    selectedRouteOrderIds,
  ]);

  const routeLinePositions =
    useMemo<[number, number][]>(() => {
      const positions: [number, number][] =
        [];

      if (startPosition) {
        positions.push([
          startPosition.latitude,
          startPosition.longitude,
        ]);
      }

      routeOrders.forEach((order) => {
        positions.push([
          Number(order.latitude),
          Number(order.longitude),
        ]);
      });

      return positions;
    }, [routeOrders, startPosition]);

  return (    <MapContainer
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      scrollWheelZoom
      className="delivery-map"
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <InvalidateMapSize />

      <FitMapToPositions
        orders={positionedOrders}
        startPosition={startPosition}
      />

      <MapCursorController
        selectedOrderId={selectedOrderId}
      />

      <MapClickHandler
        selectedOrderId={selectedOrderId}
        onPlaceOrder={onPlaceOrder}
      />

      {routeLinePositions.length > 1 && (
        <Polyline
          positions={routeLinePositions}
          pathOptions={{
            color: "#ef6a27",
            weight: 5,
            opacity: 0.88,
          }}
        />
      )}

      {startPosition && (
        <Marker
          position={[
            startPosition.latitude,
            startPosition.longitude,
          ]}
          icon={createStartIcon()}
        >
          <Popup>
            <div className="delivery-map-popup">
              <strong>Ruttens startpunkt</strong>

              <span>
                Latitud:{" "}
                {startPosition.latitude.toFixed(6)}
              </span>

              <span>
                Longitud:{" "}
                {startPosition.longitude.toFixed(6)}
              </span>
            </div>
          </Popup>
        </Marker>
      )}

      {positionedOrders.map((order) => {
        const selectedForRoute =
          selectedRouteOrderIds.includes(
            order.id,
          );

        const selectedForPlacement =
          selectedOrderId === order.id;

        return (
          <Marker
            key={order.id}
            position={[
              Number(order.latitude),
              Number(order.longitude),
            ]}
            icon={createDeliveryIcon(
              order.route_position,
              selectedForRoute,
              selectedForPlacement,
            )}
            eventHandlers={{
              click() {
                onSelectOrder(order.id);
              },
            }}
          >
            <Popup>
              <div className="delivery-map-popup">
                <strong>
                  {order.route_position !== null
                    ? `Stopp ${order.route_position}: `
                    : ""}
                  {order.customer_name}
                </strong>

                <span>
                  Order {order.order_number}
                </span>

                <span>
                  {order.street_address ||
                    "Adress saknas"}
                </span>

                <span>
                  {order.postal_code}{" "}
                  {order.city}
                </span>

                <span>
                  Status: {order.status}
                </span>

                {order.phone && (
                  <a href={`tel:${order.phone}`}>
                    📞 {order.phone}
                  </a>
                )}

                <button
                  type="button"
                  onClick={() =>
                    onSelectOrder(order.id)
                  }
                >
                  Flytta kartposition
                </button>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
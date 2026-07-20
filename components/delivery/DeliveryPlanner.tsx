"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import dynamic from "next/dynamic";

import { supabase } from "@/lib/supabase";
import { geocodeAddress } from "@/lib/delivery/geocodeAddress";

import type { DeliveryMapOrder, DeliveryMapPosition } from "./DeliveryMap";

import "./delivery-planner.css";

const DeliveryMap = dynamic(() => import("./DeliveryMap"), {
  ssr: false,
  loading: () => (
    <div className="delivery-map-loading">
      <span>🗺️</span>
      <strong>Kartan laddas...</strong>
    </div>
  ),
});

type OrderStatus =
  "Ny" | "Bekräftad" | "Planerad" | "Levererad" | "Avbruten" | string;

type Order = DeliveryMapOrder & {
  email: string | null;
  delivery_date: string | null;
  delivery_message: string | null;
  route_name: string | null;
  planned_at: string | null;
  total_items: number;
  total_price: number;
  created_at: string;
};

const ROUTABLE_STATUSES = ["Ny", "Bekräftad", "Klar", "Planerad"];

function getTodayDate() {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDate(value: string | null) {
  if (!value) {
    return "Inte planerad";
  }

  const parsedDate = new Date(`${value}T12:00:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(parsedDate);
}

function degreesToRadians(value: number) {
  return (value * Math.PI) / 180;
}

function calculateDistanceKm(
  firstPosition: DeliveryMapPosition,
  secondPosition: DeliveryMapPosition,
) {
  const earthRadiusKm = 6371;

  const latitudeDifference = degreesToRadians(
    secondPosition.latitude - firstPosition.latitude,
  );

  const longitudeDifference = degreesToRadians(
    secondPosition.longitude - firstPosition.longitude,
  );

  const firstLatitude = degreesToRadians(firstPosition.latitude);

  const secondLatitude = degreesToRadians(secondPosition.latitude);

  const calculation =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(longitudeDifference / 2) ** 2;

  const angularDistance =
    2 * Math.atan2(Math.sqrt(calculation), Math.sqrt(1 - calculation));

  return earthRadiusKm * angularDistance;
}

function optimizeRoute(orders: Order[], startPosition: DeliveryMapPosition) {
  const remainingOrders = [...orders];
  const optimizedOrders: Order[] = [];

  let currentPosition = startPosition;

  while (remainingOrders.length > 0) {
    let nearestOrderIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;

    remainingOrders.forEach((order, index) => {
      if (order.latitude === null || order.longitude === null) {
        return;
      }

      const orderPosition: DeliveryMapPosition = {
        latitude: Number(order.latitude),
        longitude: Number(order.longitude),
      };

      const distance = calculateDistanceKm(currentPosition, orderPosition);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestOrderIndex = index;
      }
    });

    const [nearestOrder] = remainingOrders.splice(nearestOrderIndex, 1);

    optimizedOrders.push(nearestOrder);

    currentPosition = {
      latitude: Number(nearestOrder.latitude),
      longitude: Number(nearestOrder.longitude),
    };
  }

  return optimizedOrders;
}

function calculateRouteDistance(
  orders: Order[],
  startPosition: DeliveryMapPosition,
) {
  let totalDistance = 0;
  let currentPosition = startPosition;

  orders.forEach((order) => {
    if (order.latitude === null || order.longitude === null) {
      return;
    }

    const orderPosition: DeliveryMapPosition = {
      latitude: Number(order.latitude),
      longitude: Number(order.longitude),
    };

    totalDistance += calculateDistanceKm(currentPosition, orderPosition);

    currentPosition = orderPosition;
  });

  return totalDistance;
}

function createGoogleMapsRouteUrl(
  orders: Order[],
  startPosition: DeliveryMapPosition,
) {
  if (orders.length === 0) {
    return "";
  }

  const destinationOrder = orders[orders.length - 1];

  const origin = `${startPosition.latitude},${startPosition.longitude}`;

  const destination = `${destinationOrder.latitude},${destinationOrder.longitude}`;

  const waypointOrders = orders.slice(0, -1);

  const waypoints = waypointOrders
    .map((order) => `${order.latitude},${order.longitude}`)
    .join("|");

  const searchParameters = new URLSearchParams({
    api: "1",
    origin,
    destination,
    travelmode: "driving",
  });

  if (waypoints) {
    searchParameters.set("waypoints", waypoints);
  }

  return `https://www.google.com/maps/dir/?${searchParameters.toString()}`;
}

function createAddressSearchUrl(order: Order) {
  const address = [order.street_address, order.postal_code, order.city]
    .filter(Boolean)
    .join(", ");

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    address,
  )}`;
}

function normalizeOrder(rawOrder: Record<string, unknown>): Order {
  return {
    id: Number(rawOrder.id),
    order_number: String(rawOrder.order_number ?? rawOrder.id ?? ""),
    customer_name: String(rawOrder.customer_name ?? "Okänd kund"),
    phone: String(rawOrder.phone ?? ""),
    email: typeof rawOrder.email === "string" ? rawOrder.email : null,
    street_address: String(rawOrder.street_address ?? ""),
    postal_code: String(rawOrder.postal_code ?? ""),
    city: String(rawOrder.city ?? ""),
    status: String(rawOrder.status ?? "Ny"),
    latitude:
      typeof rawOrder.latitude === "number"
        ? rawOrder.latitude
        : rawOrder.latitude !== null && rawOrder.latitude !== undefined
          ? Number(rawOrder.latitude)
          : null,
    longitude:
      typeof rawOrder.longitude === "number"
        ? rawOrder.longitude
        : rawOrder.longitude !== null && rawOrder.longitude !== undefined
          ? Number(rawOrder.longitude)
          : null,
    route_position:
      rawOrder.route_position !== null && rawOrder.route_position !== undefined
        ? Number(rawOrder.route_position)
        : null,
    delivery_date:
      typeof rawOrder.delivery_date === "string"
        ? rawOrder.delivery_date
        : null,
    delivery_message:
      typeof rawOrder.delivery_message === "string"
        ? rawOrder.delivery_message
        : null,
    route_name:
      typeof rawOrder.route_name === "string" ? rawOrder.route_name : null,
    planned_at:
      typeof rawOrder.planned_at === "string" ? rawOrder.planned_at : null,
    total_items: Number(rawOrder.total_items ?? 0),
    total_price: Number(rawOrder.total_price ?? 0),
    created_at: String(rawOrder.created_at ?? ""),
  };
}

export default function DeliveryPlanner() {
  const [orders, setOrders] = useState<Order[]>([]);

  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);

  const [mapPlacementOrderId, setMapPlacementOrderId] = useState<number | null>(
    null,
  );

  const [deliveryDate, setDeliveryDate] = useState(getTodayDate());

  const [routeName, setRouteName] = useState("Dagens leveransrunda");

  const [startLatitude, setStartLatitude] = useState("");

  const [startLongitude, setStartLongitude] = useState("");

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [geocoding, setGeocoding] = useState(false);

  const [message, setMessage] = useState("");

  const [errorMessage, setErrorMessage] = useState("");

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .in("status", ROUTABLE_STATUSES)
      .order("delivery_date", {
        ascending: true,
        nullsFirst: true,
      })
      .order("created_at", {
        ascending: true,
      });

    if (error) {
      setErrorMessage(`Beställningarna kunde inte hämtas: ${error.message}`);

      setLoading(false);
      return;
    }

    const normalizedOrders = (data ?? []).map((order) =>
      normalizeOrder(order as Record<string, unknown>),
    );

    setOrders(normalizedOrders);

    setSelectedOrderIds((currentSelectedIds) =>
      currentSelectedIds.filter((orderId) =>
        normalizedOrders.some((order) => order.id === orderId),
      ),
    );

    setLoading(false);
  }, []);

  useEffect(() => {
    async function initializePage() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        window.location.href = "/admin";
        return;
      }

      await loadOrders();
    }

    void initializePage();
  }, [loadOrders]);

  const startPosition = useMemo<DeliveryMapPosition | null>(() => {
    const latitude = Number(startLatitude);

    const longitude = Number(startLongitude);

    if (
      startLatitude.trim() === "" ||
      startLongitude.trim() === "" ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return null;
    }

    return {
      latitude,
      longitude,
    };
  }, [startLatitude, startLongitude]);

  const selectedOrders = useMemo(() => {
    return selectedOrderIds
      .map((orderId) => orders.find((order) => order.id === orderId))
      .filter((order): order is Order => Boolean(order));
  }, [orders, selectedOrderIds]);

  const positionedSelectedOrders = useMemo(() => {
    return selectedOrders.filter(
      (order) => order.latitude !== null && order.longitude !== null,
    );
  }, [selectedOrders]);

  const optimizedOrders = useMemo(() => {
    if (!startPosition) {
      return positionedSelectedOrders;
    }

    return optimizeRoute(positionedSelectedOrders, startPosition);
  }, [positionedSelectedOrders, startPosition]);

  const mapOrders = useMemo(() => {
    const optimizedPositions = new Map<number, number>();

    optimizedOrders.forEach((order, index) => {
      optimizedPositions.set(order.id, index + 1);
    });

    return orders.map((order) => ({
      ...order,
      route_position: optimizedPositions.get(order.id) ?? null,
    }));
  }, [orders, optimizedOrders]);

  const approximateDistance = useMemo(() => {
    if (!startPosition || optimizedOrders.length === 0) {
      return 0;
    }

    return calculateRouteDistance(optimizedOrders, startPosition);
  }, [optimizedOrders, startPosition]);

  const selectedOrderValue = useMemo(() => {
    return selectedOrders.reduce(
      (total, order) => total + Number(order.total_price || 0),
      0,
    );
  }, [selectedOrders]);

  const unpositionedSelectedCount = selectedOrders.filter(
    (order) => order.latitude === null || order.longitude === null,
  ).length;

  function toggleSelectedOrder(orderId: number) {
    setSelectedOrderIds((currentSelectedIds) => {
      if (currentSelectedIds.includes(orderId)) {
        return currentSelectedIds.filter((currentId) => currentId !== orderId);
      }

      return [...currentSelectedIds, orderId];
    });

    setMessage("");
    setErrorMessage("");
  }

  function selectAllPositionedOrders() {
    const positionedOrderIds = orders
      .filter((order) => order.latitude !== null && order.longitude !== null)
      .map((order) => order.id);

    setSelectedOrderIds(positionedOrderIds);

    setMessage(
      `${positionedOrderIds.length} beställningar med kartposition har valts.`,
    );

    setErrorMessage("");
  }

  function clearSelection() {
    setSelectedOrderIds([]);
    setMapPlacementOrderId(null);
    setMessage("Valet har rensats.");
    setErrorMessage("");
  }

  function useCurrentPosition() {
    setMessage("");
    setErrorMessage("");

    if (!navigator.geolocation) {
      setErrorMessage("Din webbläsare stöder inte GPS-position.");

      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setStartLatitude(position.coords.latitude.toFixed(7));

        setStartLongitude(position.coords.longitude.toFixed(7));

        setMessage("Din nuvarande position används som ruttens startpunkt.");
      },
      (error) => {
        if (error.code === 1) {
          setErrorMessage(
            "Webbläsaren har inte tillåtelse att använda din position.",
          );
          return;
        }

        setErrorMessage(
          "Din position kunde inte hämtas. Prova igen eller skriv in koordinaterna manuellt.",
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000,
      },
    );
  }

  async function placeOrderOnMap(
    orderId: number,
    latitude: number,
    longitude: number,
  ) {
    setSaving(true);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase
      .from("orders")
      .update({
        latitude,
        longitude,
      })
      .eq("id", orderId);

    if (error) {
      setErrorMessage(`Kartpositionen kunde inte sparas: ${error.message}`);

      setSaving(false);
      return;
    }

    setOrders((currentOrders) =>
      currentOrders.map((order) =>
        order.id === orderId
          ? {
              ...order,
              latitude,
              longitude,
            }
          : order,
      ),
    );

    setMapPlacementOrderId(null);

    setMessage("Kundens leveransplats har sparats.");

    setSaving(false);
  }

  async function removeOrderPosition(orderId: number) {
    const confirmed = window.confirm(
      "Vill du ta bort den sparade kartpositionen för denna beställning?",
    );

    if (!confirmed) {
      return;
    }

    setSaving(true);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase
      .from("orders")
      .update({
        latitude: null,
        longitude: null,
        route_position: null,
      })
      .eq("id", orderId);

    if (error) {
      setErrorMessage(`Kartpositionen kunde inte tas bort: ${error.message}`);

      setSaving(false);
      return;
    }

    setOrders((currentOrders) =>
      currentOrders.map((order) =>
        order.id === orderId
          ? {
              ...order,
              latitude: null,
              longitude: null,
              route_position: null,
            }
          : order,
      ),
    );

    setSelectedOrderIds((currentSelectedIds) =>
      currentSelectedIds.filter((currentId) => currentId !== orderId),
    );

    if (mapPlacementOrderId === orderId) {
      setMapPlacementOrderId(null);
    }

    setMessage("Kartpositionen har tagits bort.");

    setSaving(false);
  }

  async function placeAddressesAutomatically() {
    setMessage("");
    setErrorMessage("");

    const ordersWithoutPosition = orders.filter(
      (order) => order.latitude === null || order.longitude === null,
    );

    if (ordersWithoutPosition.length === 0) {
      setMessage("Alla beställningar har redan en sparad kartposition.");
      return;
    }

    const confirmed = window.confirm(
      `Vill du försöka placera ${ordersWithoutPosition.length} beställningar automatiskt från deras adresser?`,
    );

    if (!confirmed) {
      return;
    }

    setGeocoding(true);

    const successfulOrderIds: number[] = [];
    const failedOrders: string[] = [];

    try {
      for (let index = 0; index < ordersWithoutPosition.length; index += 1) {
        const order = ordersWithoutPosition[index];

        setMessage(
          `Söker adress ${index + 1} av ${ordersWithoutPosition.length}: ${order.customer_name}`,
        );

        if (!order.street_address.trim() || !order.city.trim()) {
          failedOrders.push(`${order.customer_name} – adress saknas`);
          continue;
        }

        const position = await geocodeAddress({
          streetAddress: order.street_address,
          postalCode: order.postal_code,
          city: order.city,
          country: "Sverige",
        });

        if (!position) {
          failedOrders.push(`${order.customer_name} – adressen hittades inte`);
        } else {
          const { error } = await supabase
            .from("orders")
            .update({
              latitude: position.latitude,
              longitude: position.longitude,
            })
            .eq("id", order.id);

          if (error) {
            failedOrders.push(`${order.customer_name} – ${error.message}`);
          } else {
            successfulOrderIds.push(order.id);

            setOrders((currentOrders) =>
              currentOrders.map((currentOrder) =>
                currentOrder.id === order.id
                  ? {
                      ...currentOrder,
                      latitude: position.latitude,
                      longitude: position.longitude,
                    }
                  : currentOrder,
              ),
            );
          }
        }

        if (index < ordersWithoutPosition.length - 1) {
          await new Promise((resolve) => {
            window.setTimeout(resolve, 1100);
          });
        }
      }

      if (successfulOrderIds.length > 0) {
        setSelectedOrderIds((currentSelectedIds) =>
          Array.from(new Set([...currentSelectedIds, ...successfulOrderIds])),
        );
      }

      if (failedOrders.length === 0) {
        setMessage(
          `${successfulOrderIds.length} beställningar placerades automatiskt och valdes för rutten.`,
        );
      } else {
        setMessage(
          `${successfulOrderIds.length} beställningar placerades automatiskt.`,
        );

        setErrorMessage(
          `Kunde inte placera ${failedOrders.length}: ${failedOrders.join(" | ")}`,
        );
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `Den automatiska kartplaceringen avbröts: ${error.message}`
          : "Den automatiska kartplaceringen avbröts.",
      );
    } finally {
      setGeocoding(false);
    }
  }

  async function savePlannedRoute() {
    setMessage("");
    setErrorMessage("");

    if (!deliveryDate) {
      setErrorMessage("Välj ett leveransdatum.");
      return;
    }

    if (!routeName.trim()) {
      setErrorMessage("Fyll i ett namn på rutten.");
      return;
    }

    if (!startPosition) {
      setErrorMessage(
        "Ange en giltig startposition eller använd knappen Min nuvarande position.",
      );
      return;
    }

    if (selectedOrders.length === 0) {
      setErrorMessage("Välj minst en beställning.");
      return;
    }

    if (unpositionedSelectedCount > 0) {
      setErrorMessage(
        `${unpositionedSelectedCount} vald beställning saknar kartposition. Placera alla valda beställningar på kartan först.`,
      );
      return;
    }

    setSaving(true);

    try {
      for (let index = 0; index < optimizedOrders.length; index += 1) {
        const order = optimizedOrders[index];

        const { error } = await supabase
          .from("orders")
          .update({
            delivery_date: deliveryDate,
            route_name: routeName.trim(),
            route_position: index + 1,
            status: "Planerad",
            planned_at: new Date().toISOString(),
          })
          .eq("id", order.id);

        if (error) {
          throw new Error(error.message);
        }
      }

      setMessage(
        `Rutten "${routeName.trim()}" har sparats med ${optimizedOrders.length} stopp.`,
      );

      await loadOrders();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `Rutten kunde inte sparas: ${error.message}`
          : "Rutten kunde inte sparas.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function markOrderStatus(
    order: Order,
    status: "Klar" | "Levererad",
  ) {
    const confirmed = window.confirm(
      status === "Klar"
        ? `Vill du markera beställning ${order.order_number} till ${order.customer_name} som klar?`
        : `Vill du markera beställning ${order.order_number} till ${order.customer_name} som levererad?`,
    );

    if (!confirmed) {
      return;
    }

    setSaving(true);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", order.id);

    if (error) {
      setErrorMessage(
        `Beställningen kunde inte markeras som ${status.toLocaleLowerCase("sv-SE")}: ${error.message}`,
      );
      setSaving(false);
      return;
    }

    if (status === "Levererad") {
      setSelectedOrderIds((currentSelectedIds) =>
        currentSelectedIds.filter((orderId) => orderId !== order.id),
      );
    }

    setMessage(
      `${order.customer_name} har markerats som ${status.toLocaleLowerCase("sv-SE")}.`,
    );

    await loadOrders();
    setSaving(false);
  }

  function openGoogleMapsRoute() {
    setMessage("");
    setErrorMessage("");

    if (!startPosition) {
      setErrorMessage("Ange ruttens startpunkt först.");
      return;
    }

    if (optimizedOrders.length === 0) {
      setErrorMessage("Välj minst en beställning med sparad kartposition.");
      return;
    }

    const routeUrl = createGoogleMapsRouteUrl(optimizedOrders, startPosition);

    if (!routeUrl) {
      setErrorMessage("Google Maps-rutten kunde inte skapas.");
      return;
    }

    window.open(routeUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <main className="delivery-planner-page">
      <header className="delivery-planner-header">
        <div>
          <p className="delivery-eyebrow">Administration</p>

          <h1>Leveransplanering</h1>

          <p>
            Välj beställningar, placera leveransadresser på kartan och skapa en
            smart körordning.
          </p>
        </div>

        <div className="delivery-header-actions">
          <a href="/admin">← Till adminpanelen</a>

          <button
            type="button"
            disabled={loading || saving || geocoding}
            onClick={() => void loadOrders()}
          >
            {loading ? "Hämtar..." : "↻ Uppdatera"}
          </button>
        </div>
      </header>

      {message && <div className="delivery-message">{message}</div>}

      {errorMessage && <div className="delivery-error">{errorMessage}</div>}

      <section className="delivery-settings-card">
        <div className="delivery-field">
          <label htmlFor="delivery-date">Leveransdatum</label>

          <input
            id="delivery-date"
            type="date"
            value={deliveryDate}
            disabled={saving}
            onChange={(event) => setDeliveryDate(event.target.value)}
          />
        </div>

        <div className="delivery-field delivery-field-route-name">
          <label htmlFor="route-name">Ruttens namn</label>

          <input
            id="route-name"
            type="text"
            value={routeName}
            placeholder="Exempel: Stockaryd tisdag"
            disabled={saving}
            onChange={(event) => setRouteName(event.target.value)}
          />
        </div>

        <div className="delivery-field">
          <label htmlFor="start-latitude">Startpunktens latitud</label>

          <input
            id="start-latitude"
            type="number"
            step="any"
            value={startLatitude}
            placeholder="57.3167000"
            disabled={saving}
            onChange={(event) => setStartLatitude(event.target.value)}
          />
        </div>

        <div className="delivery-field">
          <label htmlFor="start-longitude">Startpunktens longitud</label>

          <input
            id="start-longitude"
            type="number"
            step="any"
            value={startLongitude}
            placeholder="14.6000000"
            disabled={saving}
            onChange={(event) => setStartLongitude(event.target.value)}
          />
        </div>

        <button
          type="button"
          className="delivery-location-button"
          disabled={saving}
          onClick={useCurrentPosition}
        >
          📍 Min position
        </button>
      </section>

      <section className="delivery-summary">
        <article>
          <span>Valda leveranser</span>

          <strong>{selectedOrders.length}</strong>
        </article>

        <article>
          <span>Saknar kartposition</span>

          <strong>{unpositionedSelectedCount}</strong>
        </article>

        <article>
          <span>Ungefärlig sträcka</span>

          <strong>{approximateDistance.toFixed(1)} km</strong>
        </article>

        <article>
          <span>Ordervärde</span>

          <strong>{formatCurrency(selectedOrderValue)}</strong>
        </article>
      </section>

      <section className="delivery-layout">
        <section className="delivery-orders-card">
          <div className="delivery-card-heading">
            <div>
              <p className="delivery-eyebrow">Beställningar</p>

              <h2>Välj leveranser</h2>
            </div>

            <div className="delivery-selection-actions">
              <button
                type="button"
                disabled={loading || saving || geocoding}
                onClick={() => void placeAddressesAutomatically()}
              >
                {geocoding
                  ? "Placerar adresser..."
                  : "📍 Placera adresser automatiskt"}
              </button>

              <button
                type="button"
                disabled={loading || saving || geocoding}
                onClick={selectAllPositionedOrders}
              >
                Välj alla med position
              </button>

              <button
                type="button"
                disabled={selectedOrderIds.length === 0 || saving}
                onClick={clearSelection}
              >
                Rensa val
              </button>
            </div>
          </div>

          {loading ? (
            <div className="delivery-empty">
              <span>⏳</span>
              <strong>Hämtar beställningar...</strong>
            </div>
          ) : orders.length === 0 ? (
            <div className="delivery-empty">
              <span>📦</span>

              <strong>Inga beställningar att planera</strong>

              <p>Nya, bekräftade och planerade beställningar visas här.</p>
            </div>
          ) : (
            <div className="delivery-order-list">
              {orders.map((order) => {
                const selected = selectedOrderIds.includes(order.id);

                const hasPosition =
                  order.latitude !== null && order.longitude !== null;

                const routeIndex = optimizedOrders.findIndex(
                  (optimizedOrder) => optimizedOrder.id === order.id,
                );

                const isBeingPlaced = mapPlacementOrderId === order.id;

                return (
                  <article
                    key={order.id}
                    className={
                      selected ? "delivery-order selected" : "delivery-order"
                    }
                  >
                    <label className="delivery-order-select">
                      <input
                        type="checkbox"
                        checked={selected}
                        disabled={saving}
                        onChange={() => toggleSelectedOrder(order.id)}
                      />

                      <span>{routeIndex >= 0 ? routeIndex + 1 : "–"}</span>
                    </label>

                    <div className="delivery-order-info">
                      <div className="delivery-order-heading">
                        <div>
                          <strong>{order.customer_name}</strong>

                          <small>Order {order.order_number}</small>
                        </div>

                        <b>{formatCurrency(order.total_price)}</b>
                      </div>

                      <p className="delivery-order-address">
                        {order.street_address || "Adress saknas"}
                        <br />
                        {order.postal_code} {order.city}
                      </p>

                      <div className="delivery-order-tags">
                        <span>{order.status}</span>

                        <span>
                          {hasPosition
                            ? "📍 Position sparad"
                            : "⚠️ Position saknas"}
                        </span>

                        {order.delivery_date && (
                          <span>📅 {formatDate(order.delivery_date)}</span>
                        )}

                        {order.total_items > 0 && (
                          <span>📦 {order.total_items} st</span>
                        )}
                      </div>

                      {order.delivery_message && (
                        <p className="delivery-order-message">
                          <strong>Leveransmeddelande:</strong>{" "}
                          {order.delivery_message}
                        </p>
                      )}

                      <div className="delivery-order-actions">
                        <a
                          href={createAddressSearchUrl(order)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Sök adress
                        </a>

                        {order.phone && (
                          <a href={`tel:${order.phone}`}>Ring kund</a>
                        )}

                        <button
                          type="button"
                          className={isBeingPlaced ? "active" : ""}
                          disabled={saving}
                          onClick={() =>
                            setMapPlacementOrderId(
                              isBeingPlaced ? null : order.id,
                            )
                          }
                        >
                          {isBeingPlaced
                            ? "Klicka på kartan"
                            : hasPosition
                              ? "Flytta position"
                              : "Placera på kartan"}
                        </button>

                        {hasPosition && (
                          <button
                            type="button"
                            className="remove-position-button"
                            disabled={saving}
                            onClick={() => void removeOrderPosition(order.id)}
                          >
                            Ta bort position
                          </button>
                        )}

                        {order.status !== "Klar" && (
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() =>
                              void markOrderStatus(order, "Klar")
                            }
                          >
                            ✓ Markera som klar
                          </button>
                        )}

                        <button
                          type="button"
                          className="delivered-button"
                          disabled={saving}
                          onClick={() =>
                            void markOrderStatus(order, "Levererad")
                          }
                        >
                          ✓ Levererad
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="delivery-map-card">
          {mapPlacementOrderId !== null && (
            <div className="delivery-map-instruction">
              Klicka på kundens exakta leveransplats på kartan
            </div>
          )}

          <DeliveryMap
            orders={mapOrders}
            selectedOrderId={mapPlacementOrderId}
            selectedRouteOrderIds={selectedOrderIds}
            startPosition={startPosition}
            onSelectOrder={(orderId) => setMapPlacementOrderId(orderId)}
            onPlaceOrder={placeOrderOnMap}
          />

          <div className="delivery-route-list">
            <div className="delivery-route-list-heading">
              <div>
                <p className="delivery-eyebrow">Föreslagen körordning</p>

                <h3>{optimizedOrders.length} stopp</h3>
              </div>

              <strong>{approximateDistance.toFixed(1)} km</strong>
            </div>

            {optimizedOrders.length === 0 ? (
              <p className="delivery-route-empty">
                Välj beställningar med kartposition för att skapa en körordning.
              </p>
            ) : (
              <ol>
                {optimizedOrders.map((order) => (
                  <li key={order.id}>
                    <span>{order.customer_name}</span>

                    <small>
                      {order.street_address}, {order.city}
                    </small>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="delivery-route-actions">
            <button
              type="button"
              className="save-route-button"
              disabled={saving || selectedOrders.length === 0}
              onClick={() => void savePlannedRoute()}
            >
              {saving ? "Sparar..." : "Spara planerad rutt"}
            </button>

            <button
              type="button"
              className="google-maps-button"
              disabled={saving || optimizedOrders.length === 0}
              onClick={openGoogleMapsRoute}
            >
              🗺️ Öppna i Google Maps
            </button>
          </div>
        </section>
      </section>
    </main>
  );
}

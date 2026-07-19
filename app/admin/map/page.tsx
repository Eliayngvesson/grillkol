"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  CircleMarker,
  LayerGroup,
  Map as LeafletMap,
  Polyline,
} from "leaflet";
import { supabase } from "@/lib/supabase";
import "leaflet/dist/leaflet.css";
import "./map.css";

type OrderStatus =
  | "Ny"
  | "Bekräftad"
  | "Planerad"
  | "Levererad"
  | "Avbruten";

type OrderProduct = {
  id?: number;
  name: string;
  weight?: string;
  price: number;
  quantity: number;
  rowTotal: number;
};

type Order = {
  id: number;
  order_number: string;
  customer_name: string;
  phone: string;
  email: string | null;
  street_address: string;
  postal_code: string;
  city: string;
  delivery_date: string | null;
  products: OrderProduct[];
  total_items: number;
  total_price: number;
  status: OrderStatus;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
};

type Coordinates = {
  latitude: number;
  longitude: number;
};

type GeocodingResult = {
  lat: string;
  lon: string;
  display_name: string;
};

type OsrmWaypoint = {
  waypoint_index: number;
  trips_index: number;
  location: [number, number];
  name: string;
};

type OsrmTrip = {
  distance: number;
  duration: number;
  geometry: {
    type: "LineString";
    coordinates: [number, number][];
  };
};

type OsrmTripResponse = {
  code: string;
  message?: string;
  waypoints?: OsrmWaypoint[];
  trips?: OsrmTrip[];
};

type RouteStop = {
  order: Order;
  stopNumber: number;
};

const ACTIVE_STATUSES: OrderStatus[] = [
  "Ny",
  "Bekräftad",
  "Planerad",
];

const DEFAULT_MAP_CENTER: [number, number] = [
  57.315,
  14.591,
];

function formatDate(value: string | null) {
  if (!value) {
    return "Inget datum";
  }

  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDistance(meters: number) {
  if (meters < 1000) {
    return `${Math.round(meters)} meter`;
  }

  return `${(meters / 1000).toFixed(1)} km`;
}

function formatDuration(seconds: number) {
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes} minuter`;
  }

  return `${hours} tim ${minutes} min`;
}

function getOrderAddress(order: Order) {
  return [
    order.street_address,
    order.postal_code,
    order.city,
    "Sverige",
  ]
    .filter(Boolean)
    .join(", ");
}

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export default function DeliveryMapPage() {
  const mapElementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerLayerRef = useRef<LayerGroup | null>(null);
  const routeLineRef = useRef<Polyline | null>(null);
  const startMarkerRef = useRef<CircleMarker | null>(null);

  const [sessionChecked, setSessionChecked] =
    useState(false);

  const [isLoggedIn, setIsLoggedIn] =
    useState(false);

  const [orders, setOrders] = useState<Order[]>([]);

  const [selectedOrderIds, setSelectedOrderIds] =
    useState<number[]>([]);

  const [selectedDate, setSelectedDate] =
    useState("");

  const [startAddress, setStartAddress] =
    useState("Stockaryd");

  const [startCoordinates, setStartCoordinates] =
    useState<Coordinates | null>(null);

  const [usingGps, setUsingGps] =
    useState(false);

  const [gpsAccuracy, setGpsAccuracy] =
    useState<number | null>(null);

  const [routeStops, setRouteStops] =
    useState<RouteStop[]>([]);

  const [routeDistance, setRouteDistance] =
    useState<number | null>(null);

  const [routeDuration, setRouteDuration] =
    useState<number | null>(null);

  const [loadingOrders, setLoadingOrders] =
    useState(false);

  const [planningRoute, setPlanningRoute] =
    useState(false);

  const [geocodingProgress, setGeocodingProgress] =
    useState("");

  const [message, setMessage] =
    useState<string | null>(null);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const filteredOrders = useMemo(() => {
    if (!selectedDate) {
      return orders;
    }

    return orders.filter(
      (order) =>
        order.delivery_date === selectedDate,
    );
  }, [orders, selectedDate]);

  const selectedOrders = useMemo(() => {
    return filteredOrders.filter((order) =>
      selectedOrderIds.includes(order.id),
    );
  }, [filteredOrders, selectedOrderIds]);

  const loadOrders = useCallback(async () => {
    setLoadingOrders(true);
    setErrorMessage(null);

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .in("status", ACTIVE_STATUSES)
      .order("delivery_date", {
        ascending: true,
        nullsFirst: false,
      })
      .order("created_at", {
        ascending: true,
      });

    if (error) {
      setErrorMessage(
        `Beställningarna kunde inte hämtas: ${error.message}`,
      );

      setLoadingOrders(false);
      return;
    }

    const loadedOrders = (data ?? []) as Order[];

    setOrders(loadedOrders);

    setSelectedOrderIds(
      loadedOrders.map((order) => order.id),
    );

    setLoadingOrders(false);
  }, []);

  useEffect(() => {
    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const loggedIn = Boolean(session);

      setIsLoggedIn(loggedIn);
      setSessionChecked(true);

      if (loggedIn) {
        await loadOrders();
      }
    }

    void checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setIsLoggedIn(Boolean(session));
      },
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [loadOrders]);

  useEffect(() => {
    let cancelled = false;

    async function initializeMap() {
      if (
        !mapElementRef.current ||
        mapRef.current
      ) {
        return;
      }

      const leaflet = await import("leaflet");

      if (
        cancelled ||
        !mapElementRef.current
      ) {
        return;
      }

      const map = leaflet
        .map(mapElementRef.current)
        .setView(DEFAULT_MAP_CENTER, 9);

      leaflet
        .tileLayer(
          "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
          {
            maxZoom: 19,
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          },
        )
        .addTo(map);

      markerLayerRef.current =
        leaflet.layerGroup().addTo(map);

      mapRef.current = map;

      window.setTimeout(() => {
        map.invalidateSize();
      }, 100);
    }

    if (isLoggedIn) {
      void initializeMap();
    }

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  useEffect(() => {
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  const geocodeAddress = useCallback(
    async (
      address: string,
    ): Promise<Coordinates> => {
      const parameters = new URLSearchParams({
        q: address,
        format: "jsonv2",
        limit: "1",
        countrycodes: "se",
        addressdetails: "1",
      });

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?${parameters.toString()}`,
        {
          headers: {
            Accept: "application/json",
            "Accept-Language": "sv",
          },
        },
      );

      if (!response.ok) {
        throw new Error(
          `Adressökningen misslyckades (${response.status}).`,
        );
      }

      const results =
        (await response.json()) as GeocodingResult[];

      if (results.length === 0) {
        throw new Error(
          `Adressen "${address}" kunde inte hittas.`,
        );
      }

      const latitude = Number(results[0].lat);
      const longitude = Number(results[0].lon);

      if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude)
      ) {
        throw new Error(
          `Ogiltig kartposition för "${address}".`,
        );
      }

      return {
        latitude,
        longitude,
      };
    },
    [],
  );

  const ensureOrderCoordinates = useCallback(
    async (ordersToCheck: Order[]) => {
      const completedOrders: Order[] = [];

      for (
        let index = 0;
        index < ordersToCheck.length;
        index += 1
      ) {
        const order = ordersToCheck[index];

        if (
          order.latitude !== null &&
          order.longitude !== null
        ) {
          completedOrders.push(order);
          continue;
        }

        setGeocodingProgress(
          `Söker adress ${index + 1} av ${
            ordersToCheck.length
          }: ${order.customer_name}`,
        );

        const coordinates =
          await geocodeAddress(
            getOrderAddress(order),
          );

        const { error } = await supabase
          .from("orders")
          .update({
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
          })
          .eq("id", order.id);

        if (error) {
          throw new Error(
            `Positionen för ${order.customer_name} kunde inte sparas: ${error.message}`,
          );
        }

        const updatedOrder: Order = {
          ...order,
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
        };

        completedOrders.push(updatedOrder);

        setOrders((currentOrders) =>
          currentOrders.map((currentOrder) =>
            currentOrder.id === order.id
              ? updatedOrder
              : currentOrder,
          ),
        );

        await wait(1100);
      }

      return completedOrders;
    },
    [geocodeAddress],
  );

  const drawRoute = useCallback(
    async (
      start: Coordinates,
      plannedOrders: RouteStop[],
      geometry: [number, number][],
    ) => {
      const leaflet = await import("leaflet");

      const map = mapRef.current;
      const markerLayer =
        markerLayerRef.current;

      if (!map || !markerLayer) {
        return;
      }

      markerLayer.clearLayers();

      if (routeLineRef.current) {
        routeLineRef.current.remove();
        routeLineRef.current = null;
      }

      if (startMarkerRef.current) {
        startMarkerRef.current.remove();
        startMarkerRef.current = null;
      }

      startMarkerRef.current = leaflet
        .circleMarker(
          [
            start.latitude,
            start.longitude,
          ],
          {
            radius: 10,
            weight: 3,
            color: "#111827",
            fillColor: "#ffffff",
            fillOpacity: 1,
          },
        )
        .bindPopup(
          `<strong>Start</strong><br>${escapeHtml(
            startAddress,
          )}`,
        )
        .addTo(map);

      plannedOrders.forEach(
        (routeStop) => {
          const { order, stopNumber } =
            routeStop;

          if (
            order.latitude === null ||
            order.longitude === null
          ) {
            return;
          }

          const markerIcon =
            leaflet.divIcon({
              className:
                "delivery-map-marker-wrapper",
              html: `
                <div class="delivery-map-marker">
                  <span>${stopNumber}</span>
                </div>
              `,
              iconSize: [38, 38],
              iconAnchor: [19, 38],
              popupAnchor: [0, -38],
            });

          leaflet
            .marker(
              [
                order.latitude,
                order.longitude,
              ],
              {
                icon: markerIcon,
              },
            )
            .bindPopup(`
              <div class="map-popup">
                <strong>
                  Stopp ${stopNumber}: ${escapeHtml(
                    order.customer_name,
                  )}
                </strong>

                <span>
                  ${escapeHtml(
                    order.street_address,
                  )}
                </span>

                <span>
                  ${escapeHtml(
                    `${order.postal_code} ${order.city}`,
                  )}
                </span>

                <span>
                  ${escapeHtml(order.phone)}
                </span>

                <span>
                  ${escapeHtml(
                    formatPrice(
                      order.total_price,
                    ),
                  )}
                </span>
              </div>
            `)
            .addTo(markerLayer);
        },
      );

      const routeCoordinates =
        geometry.map(
          ([longitude, latitude]) =>
            [
              latitude,
              longitude,
            ] as [number, number],
        );

      routeLineRef.current =
        leaflet
          .polyline(routeCoordinates, {
            weight: 6,
            opacity: 0.85,
          })
          .addTo(map);

      const allLayers =
        leaflet.featureGroup([
          routeLineRef.current,
          markerLayer,
          startMarkerRef.current,
        ]);

      map.fitBounds(allLayers.getBounds(), {
        padding: [40, 40],
      });
    },
    [startAddress],
  );

  function useCurrentPosition() {
    setErrorMessage(null);
    setMessage(null);

    if (!navigator.geolocation) {
      setErrorMessage(
        "Den här enheten eller webbläsaren stöder inte GPS-positionering.",
      );
      return;
    }

    setUsingGps(true);

    setGeocodingProgress(
      "Hämtar telefonens aktuella position...",
    );

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coordinates: Coordinates = {
          latitude:
            position.coords.latitude,
          longitude:
            position.coords.longitude,
        };

        setStartCoordinates(coordinates);

        setGpsAccuracy(
          position.coords.accuracy,
        );

        setStartAddress(
          "Min aktuella position",
        );

        setUsingGps(false);
        setGeocodingProgress("");

        setMessage(
          `Telefonens position hittades med cirka ${Math.round(
            position.coords.accuracy,
          )} meters noggrannhet.`,
        );

        const map = mapRef.current;

        if (map) {
          map.setView(
            [
              coordinates.latitude,
              coordinates.longitude,
            ],
            14,
          );
        }
      },
      (error) => {
        setUsingGps(false);
        setGeocodingProgress("");

        if (
          error.code ===
          error.PERMISSION_DENIED
        ) {
          setErrorMessage(
            "Du nekade platsåtkomst. Tillåt platsåtkomst i webbläsarens inställningar och försök igen.",
          );
          return;
        }

        if (
          error.code ===
          error.POSITION_UNAVAILABLE
        ) {
          setErrorMessage(
            "Positionen kunde inte bestämmas. Kontrollera att GPS och platstjänster är aktiverade.",
          );
          return;
        }

        if (
          error.code === error.TIMEOUT
        ) {
          setErrorMessage(
            "Det tog för lång tid att hitta positionen. Försök igen, gärna utomhus.",
          );
          return;
        }

        setErrorMessage(
          "Telefonens position kunde inte hämtas.",
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 30000,
      },
    );
  }

  async function planRoute() {
    setErrorMessage(null);
    setMessage(null);
    setRouteStops([]);
    setRouteDistance(null);
    setRouteDuration(null);
    setGeocodingProgress("");

    if (
      !startAddress.trim() &&
      !startCoordinates
    ) {
      setErrorMessage(
        "Ange en startadress eller använd telefonens GPS.",
      );
      return;
    }

    if (selectedOrders.length === 0) {
      setErrorMessage(
        "Välj minst en beställning som ska ingå i rutten.",
      );
      return;
    }

    setPlanningRoute(true);

    try {
      let start: Coordinates;

      if (
        startAddress ===
          "Min aktuella position" &&
        startCoordinates
      ) {
        start = startCoordinates;
      } else {
        setGeocodingProgress(
          "Söker startadressen...",
        );

        start = await geocodeAddress(
          `${startAddress.trim()}, Sverige`,
        );

        setStartCoordinates(start);
        setGpsAccuracy(null);

        await wait(1100);
      }

      const ordersWithCoordinates =
        await ensureOrderCoordinates(
          selectedOrders,
        );

      setGeocodingProgress(
        "Beräknar bästa körordning...",
      );

      const coordinateString = [
        `${start.longitude},${start.latitude}`,
        ...ordersWithCoordinates.map(
          (order) =>
            `${order.longitude},${order.latitude}`,
        ),
      ].join(";");

      const routeParameters =
        new URLSearchParams({
          roundtrip: "true",
          source: "first",
          destination: "any",
          geometries: "geojson",
          overview: "full",
          steps: "false",
        });

      const routeResponse =
        await fetch(
          `https://router.project-osrm.org/trip/v1/driving/${coordinateString}?${routeParameters.toString()}`,
        );

      if (!routeResponse.ok) {
        throw new Error(
          `Rutten kunde inte beräknas (${routeResponse.status}).`,
        );
      }

      const routeData =
        (await routeResponse.json()) as OsrmTripResponse;

      if (
        routeData.code !== "Ok" ||
        !routeData.trips?.[0] ||
        !routeData.waypoints
      ) {
        throw new Error(
          routeData.message ||
            "Ingen sammanhängande rutt kunde skapas.",
        );
      }

      const plannedStops =
        ordersWithCoordinates
          .map((order, index) => ({
            order,
            waypointIndex:
              routeData.waypoints?.[
                index + 1
              ]?.waypoint_index ??
              index + 1,
          }))
          .sort(
            (first, second) =>
              first.waypointIndex -
              second.waypointIndex,
          )
          .map((item, index) => ({
            order: item.order,
            stopNumber: index + 1,
          }));

      const trip = routeData.trips[0];

      setRouteStops(plannedStops);
      setRouteDistance(trip.distance);
      setRouteDuration(trip.duration);
      setGeocodingProgress("");

      setMessage(
        `Rutten är klar med ${plannedStops.length} leveransstopp.`,
      );

      await drawRoute(
        start,
        plannedStops,
        trip.geometry.coordinates,
      );
    } catch (error) {
      console.error(error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Rutten kunde inte skapas.",
      );

      setGeocodingProgress("");
    } finally {
      setPlanningRoute(false);
    }
  }

  function toggleOrder(orderId: number) {
    setSelectedOrderIds((currentIds) =>
      currentIds.includes(orderId)
        ? currentIds.filter(
            (currentId) =>
              currentId !== orderId,
          )
        : [...currentIds, orderId],
    );
  }

  function selectAllVisibleOrders() {
    const visibleOrderIds =
      filteredOrders.map(
        (order) => order.id,
      );

    setSelectedOrderIds(
      (currentIds) => {
        const otherIds =
          currentIds.filter(
            (id) =>
              !visibleOrderIds.includes(id),
          );

        return [
          ...otherIds,
          ...visibleOrderIds,
        ];
      },
    );
  }

  function clearVisibleOrders() {
    const visibleOrderIds =
      filteredOrders.map(
        (order) => order.id,
      );

    setSelectedOrderIds(
      (currentIds) =>
        currentIds.filter(
          (id) =>
            !visibleOrderIds.includes(id),
        ),
    );
  }

  if (!sessionChecked) {
    return (
      <main className="route-loading-page">
        <div className="route-spinner" />
        <p>Kontrollerar inloggning...</p>
      </main>
    );
  }

  if (!isLoggedIn) {
    return (
      <main className="route-login-page">
        <section className="route-login-card">
          <span>🗺️</span>

          <h1>Du behöver logga in</h1>

          <p>
            Logga in i adminpanelen innan
            du öppnar leveranskartan.
          </p>

          <a href="/admin">
            Till adminpanelen
          </a>
        </section>
      </main>
    );
  }

  return (
    <main className="route-page">
      <header className="route-header">
        <div>
          <p className="route-eyebrow">
            Grillkol administration
          </p>

          <h1>
            Leveranskarta och
            ruttplanering
          </h1>

          <p>
            Använd telefonens GPS eller
            ange en startadress och skapa
            en körordning.
          </p>
        </div>

        <div className="route-header-actions">
          <a href="/admin">
            ← Adminpanel
          </a>

          <button
            type="button"
            onClick={() =>
              void loadOrders()
            }
            disabled={
              loadingOrders ||
              planningRoute
            }
          >
            {loadingOrders
              ? "Uppdaterar..."
              : "Uppdatera ordrar"}
          </button>
        </div>
      </header>

      {message && (
        <div className="route-success">
          {message}
        </div>
      )}

      {errorMessage && (
        <div className="route-error">
          {errorMessage}
        </div>
      )}

      <section className="route-controls">
        <label>
          Startadress

          <input
            type="text"
            value={startAddress}
            onChange={(event) => {
              setStartAddress(
                event.target.value,
              );

              setStartCoordinates(null);
              setGpsAccuracy(null);
            }}
            placeholder="Exempelvis Stockaryd"
            disabled={
              planningRoute || usingGps
            }
          />
        </label>

        <div className="gps-control">
          <span>
            Start från telefonen
          </span>

          <button
            type="button"
            className="gps-position-button"
            onClick={useCurrentPosition}
            disabled={
              planningRoute || usingGps
            }
          >
            {usingGps
              ? "Hämtar position..."
              : "📍 Använd min position"}
          </button>

          {gpsAccuracy !== null && (
            <small>
              Noggrannhet: cirka{" "}
              {Math.round(gpsAccuracy)}{" "}
              meter
            </small>
          )}
        </div>

        <label>
          Leveransdatum

          <input
            type="date"
            value={selectedDate}
            onChange={(event) =>
              setSelectedDate(
                event.target.value,
              )
            }
            disabled={planningRoute}
          />
        </label>

        <button
          type="button"
          className="plan-route-button"
          onClick={() =>
            void planRoute()
          }
          disabled={
            planningRoute ||
            loadingOrders ||
            selectedOrders.length === 0
          }
        >
          {planningRoute
            ? "Planerar rutten..."
            : `Planera rutt (${selectedOrders.length} stopp)`}
        </button>
      </section>

      {geocodingProgress && (
        <div className="route-progress">
          <div className="route-spinner small" />

          <span>
            {geocodingProgress}
          </span>
        </div>
      )}

      <section className="route-summary-grid">
        <article>
          <span>Valda leveranser</span>

          <strong>
            {selectedOrders.length}
          </strong>
        </article>

        <article>
          <span>Körsträcka</span>

          <strong>
            {routeDistance !== null
              ? formatDistance(
                  routeDistance,
                )
              : "–"}
          </strong>
        </article>

        <article>
          <span>
            Beräknad körtid
          </span>

          <strong>
            {routeDuration !== null
              ? formatDuration(
                  routeDuration,
                )
              : "–"}
          </strong>
        </article>

        <article>
          <span>Startposition</span>

          <strong>
            {startCoordinates
              ? startAddress ===
                "Min aktuella position"
                ? "Telefonens GPS"
                : "Adress hittad"
              : "Inte beräknad"}
          </strong>
        </article>
      </section>

      <section className="route-layout">
        <aside className="delivery-list-panel">
          <div className="delivery-list-heading">
            <div>
              <h2>Leveranser</h2>

              <p>
                {filteredOrders.length}{" "}
                beställningar visas
              </p>
            </div>

            <div>
              <button
                type="button"
                onClick={
                  selectAllVisibleOrders
                }
              >
                Välj alla
              </button>

              <button
                type="button"
                onClick={
                  clearVisibleOrders
                }
              >
                Rensa
              </button>
            </div>
          </div>

          {loadingOrders ? (
            <div className="route-empty-state">
              Hämtar beställningar...
            </div>
          ) : filteredOrders.length ===
            0 ? (
            <div className="route-empty-state">
              Inga aktiva beställningar
              hittades.
            </div>
          ) : (
            <div className="delivery-list">
              {filteredOrders.map(
                (order) => {
                  const selected =
                    selectedOrderIds.includes(
                      order.id,
                    );

                  const plannedStop =
                    routeStops.find(
                      (stop) =>
                        stop.order.id ===
                        order.id,
                    );

                  return (
                    <article
                      className={`delivery-card ${
                        selected
                          ? "selected"
                          : ""
                      }`}
                      key={order.id}
                    >
                      <label className="delivery-select">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() =>
                            toggleOrder(
                              order.id,
                            )
                          }
                          disabled={
                            planningRoute
                          }
                        />

                        <span>
                          {plannedStop
                            ? `Stopp ${plannedStop.stopNumber}`
                            : "Välj"}
                        </span>
                      </label>

                      <div className="delivery-card-content">
                        <div className="delivery-card-heading">
                          <div>
                            <h3>
                              {
                                order.customer_name
                              }
                            </h3>

                            <span>
                              {
                                order.order_number
                              }
                            </span>
                          </div>

                          <span className="delivery-status">
                            {order.status}
                          </span>
                        </div>

                        <p>
                          {
                            order.street_address
                          }
                        </p>

                        <p>
                          {
                            order.postal_code
                          }{" "}
                          {order.city}
                        </p>

                        <div className="delivery-card-details">
                          <a
                            href={`tel:${order.phone}`}
                          >
                            📞 {order.phone}
                          </a>

                          <span>
                            📅{" "}
                            {formatDate(
                              order.delivery_date,
                            )}
                          </span>

                          <strong>
                            {formatPrice(
                              order.total_price,
                            )}
                          </strong>
                        </div>

                        <div className="coordinate-status">
                          {order.latitude !==
                            null &&
                          order.longitude !==
                            null
                            ? "📍 Kartposition sparad"
                            : "⌛ Kartposition söks när rutten planeras"}
                        </div>
                      </div>
                    </article>
                  );
                },
              )}
            </div>
          )}
        </aside>

        <section className="map-panel">
          <div
            ref={mapElementRef}
            className="delivery-map"
            aria-label="Karta över leveranser"
          />
        </section>
      </section>

      {routeStops.length > 0 && (
        <section className="planned-route-section">
          <div className="planned-route-heading">
            <div>
              <p className="route-eyebrow">
                Föreslagen körordning
              </p>

              <h2>Leveransstopp</h2>
            </div>

            <span>
              Start och slut:{" "}
              {startAddress}
            </span>
          </div>

          <div className="planned-route-list">
            <article className="planned-stop start-stop">
              <span className="stop-number">
                Start
              </span>

              <div>
                <strong>
                  {startAddress}
                </strong>

                <p>
                  Rutten börjar här
                </p>
              </div>
            </article>

            {routeStops.map(
              (routeStop) => (
                <article
                  className="planned-stop"
                  key={
                    routeStop.order.id
                  }
                >
                  <span className="stop-number">
                    {
                      routeStop.stopNumber
                    }
                  </span>

                  <div>
                    <strong>
                      {
                        routeStop.order
                          .customer_name
                      }
                    </strong>

                    <p>
                      {
                        routeStop.order
                          .street_address
                      }
                      ,{" "}
                      {
                        routeStop.order
                          .postal_code
                      }{" "}
                      {
                        routeStop.order
                          .city
                      }
                    </p>

                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                        getOrderAddress(
                          routeStop.order,
                        ),
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Starta navigation
                      till stoppet
                    </a>
                  </div>

                  <div className="planned-stop-summary">
                    <span>
                      {
                        routeStop.order
                          .total_items
                      }{" "}
                      produkter
                    </span>

                    <strong>
                      {formatPrice(
                        routeStop.order
                          .total_price,
                      )}
                    </strong>
                  </div>
                </article>
              ),
            )}
          </div>
        </section>
      )}
    </main>
  );
}
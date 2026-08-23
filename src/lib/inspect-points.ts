export type InspectViewId = "puertas" | "interior" | "lateral";
export type LateralSide = "izquierdo" | "derecho";

export type InspectPoint = {
  id: string;
  view: InspectViewId;
  n: string;
  label: string;
  component: string;
  locCode: string;
  x: number;
  y: number;
};

export const INSPECT_VIEWS: { id: InspectViewId; title: string; src: string }[] = [
  { id: "puertas", title: "Puertas", src: "/inspect/puertas.jpg" },
  { id: "interior", title: "Interior", src: "/inspect/interior.jpg" },
  { id: "lateral", title: "Lateral", src: "/inspect/lateral.jpg" },
];

export const INSPECT_POINTS: InspectPoint[] = [
  { id: "p-01", view: "puertas", n: "1", label: "Código del propietario", component: "PUERTAS", locCode: "DXXX", x: 78, y: 20 },
  { id: "p-02", view: "puertas", n: "2", label: "Panel de puertas", component: "PUERTAS", locCode: "DXXX", x: 38, y: 26 },
  { id: "p-03", view: "puertas", n: "3", label: "Manijas", component: "PUERTAS", locCode: "DXXX", x: 22, y: 58 },
  { id: "p-04", view: "puertas", n: "4", label: "Retenedor", component: "PUERTAS", locCode: "DXXX", x: 28, y: 60 },
  { id: "p-05", view: "puertas", n: "5", label: "Base del retenedor", component: "PUERTAS", locCode: "DXXX", x: 30, y: 68 },
  { id: "p-06", view: "puertas", n: "6", label: "Barra de cierre", component: "PUERTAS", locCode: "DXXX", x: 64, y: 34 },
  { id: "p-07", view: "puertas", n: "7", label: "Guía de barra", component: "PUERTAS", locCode: "DXXX", x: 52, y: 40 },
  { id: "p-08", view: "puertas", n: "8", label: "Placa CSC", component: "PUERTAS", locCode: "DXXX", x: 34, y: 52 },
  { id: "p-09", view: "puertas", n: "9", label: "Capacidad de tara y carga", component: "PUERTAS", locCode: "DXXX", x: 74, y: 48 },
  { id: "p-10", view: "puertas", n: "10", label: "Dado esquinero", component: "ESQUINAS", locCode: "EXXX", x: 92, y: 8 },
  { id: "p-11", view: "puertas", n: "11", label: "Ménsula", component: "PUERTAS", locCode: "DXXX", x: 42, y: 10 },
  { id: "p-12", view: "puertas", n: "12", label: "Uña", component: "PUERTAS", locCode: "DXXX", x: 50, y: 86 },
  { id: "p-13", view: "puertas", n: "13", label: "Sostén de uña", component: "PUERTAS", locCode: "DXXX", x: 38, y: 90 },
  { id: "p-14", view: "puertas", n: "14", label: "Empaque de puerta", component: "SELLOS", locCode: "DXXX", x: 50, y: 54 },
  { id: "p-15", view: "puertas", n: "15", label: "Bisagras", component: "PUERTAS", locCode: "DXXX", x: 8, y: 38 },
  { id: "p-16", view: "puertas", n: "16", label: "Postes esquineros", component: "ESQUINAS", locCode: "EXXX", x: 94, y: 38 },
  { id: "p-17", view: "puertas", n: "17", label: "Logo de naviera", component: "PUERTAS", locCode: "DXXX", x: 38, y: 42 },
  { id: "p-18", view: "puertas", n: "18", label: "Viga trasera superior", component: "EXTERIOR", locCode: "DXXX", x: 50, y: 6 },
  { id: "p-19", view: "puertas", n: "19", label: "Viga trasera inferior", component: "BAJO ESTRUCTURA", locCode: "DXXX", x: 56, y: 94 },
  { id: "p-20", view: "puertas", n: "20", label: "Tipo de contenedor", component: "PUERTAS", locCode: "DXXX", x: 84, y: 14 },

  { id: "i-01", view: "interior", n: "1", label: "Línea máxima de carga", component: "INTERIOR", locCode: "ILXX", x: 22, y: 14 },
  { id: "i-02", view: "interior", n: "2", label: "Monitores de temperatura", component: "FRENTE", locCode: "IFXX", x: 50, y: 40 },
  { id: "i-03", view: "interior", n: "3", label: "Salida de aire caliente", component: "FRENTE", locCode: "IFXX", x: 52, y: 24 },
  { id: "i-04", view: "interior", n: "4", label: "Entrada de aire frío", component: "FRENTE", locCode: "IFXX", x: 52, y: 56 },
  { id: "i-05", view: "interior", n: "5", label: "Revisar piso", component: "PISO", locCode: "IBXX", x: 50, y: 76 },
  { id: "i-06", view: "interior", n: "6", label: "Paneles", component: "LADO IZQUIERDO", locCode: "ILXX", x: 16, y: 46 },
  { id: "i-07", view: "interior", n: "7", label: "Techo", component: "TECHO", locCode: "ITXX", x: 50, y: 10 },
  { id: "i-08", view: "interior", n: "8", label: "Paredes", component: "LADO DERECHO", locCode: "IRXX", x: 84, y: 38 },

  { id: "l-01", view: "lateral", n: "01", label: "Poste esquinero", component: "ESQUINAS", locCode: "EXXX", x: 72, y: 42 },
  { id: "l-02", view: "lateral", n: "02", label: "Barandilla superior", component: "EXTERIOR", locCode: "LXXX", x: 42, y: 20 },
  { id: "l-03", view: "lateral", n: "03", label: "Número del contenedor", component: "EXTERIOR", locCode: "LXXX", x: 58, y: 24 },
  { id: "l-04", view: "lateral", n: "04", label: "Panel lateral", component: "LADO IZQUIERDO", locCode: "LXXX", x: 44, y: 40 },
  { id: "l-05", view: "lateral", n: "05", label: "Logo de naviera", component: "EXTERIOR", locCode: "LXXX", x: 20, y: 38 },
  { id: "l-06", view: "lateral", n: "06", label: "Barandilla inferior", component: "BAJO ESTRUCTURA", locCode: "LXXX", x: 36, y: 70 },
];

export function pointsForView(view: InspectViewId) {
  return INSPECT_POINTS.filter((p) => p.view === view);
}

export function pointById(id: string) {
  return INSPECT_POINTS.find((p) => p.id === id);
}

export function captureKey(pointId: string, side?: string) {
  return side ? `${pointId}:${side}` : pointId;
}

export function withLateralSide(point: InspectPoint, side: LateralSide) {
  if (point.view !== "lateral") {
    return { label: point.label, component: point.component, locCode: point.locCode };
  }
  const right = side === "derecho";
  let component = point.component;
  let locCode = point.locCode;
  if (component === "LADO IZQUIERDO" || component === "LADO DERECHO") {
    component = right ? "LADO DERECHO" : "LADO IZQUIERDO";
  }
  if (locCode === "LXXX" || locCode === "RXXX") {
    locCode = right ? "RXXX" : "LXXX";
  }
  return {
    label: `${point.label} · lado ${side}`,
    component,
    locCode,
  };
}

export interface RoomDefinition {
  id: string;
  name: string;
  private: boolean;
  capacity: number;
}

export const ROOMS: RoomDefinition[] = [
  { id: "geral", name: "Sala geral", private: false, capacity: 10 },
  { id: "sala-01", name: "Sala 01", private: false, capacity: 10 },
  { id: "sala-02", name: "Sala 02", private: false, capacity: 10 },
  { id: "sala-03", name: "Sala 03", private: false, capacity: 10 },
  { id: "privada-01", name: "Privada 01", private: true, capacity: 2 }
];

/**
 * INSTRUCCIONES PARA REEMPLAZAR DATOS:
 * 1. Puedes editar directamente los valores de estos arrays.
 * 2. Asegúrate de mantener la estructura de los objetos (mismos nombres de propiedades).
 * 3. Si tienes un archivo CSV o Excel, puedes convertirlo a JSON y pegarlo aquí.
 */

export const mockCrimes = [
  {
    id: "109553",
    date: "1/3/2026",
    time: "10:01:00",
    location: "Calle 13116 3332",
    type: "Hurto (Art. 162)",
    description: "Me comunico con la línea 911 para radicar denuncia contra NN por hechos que pueden configurar delitos. En fecha 01/03/2026 09:30hs me anoticio que mi portón estaba 40cm y con la llave para afuera. La cerradura no tiene daños, funciona No me faltan objetos materiales Temo que en algún momento regresen y me siento indefensa. Desconozco la existencia de cámaras de seguridad. Es la primera vez que me sucede, pero a la casa que se encuentra frente a mi domicilio ya han intentado ingresar, un vecino interrumpió el hecho y escaparon. Suelen robar en esta zona. .",
    objects: ["S/D"],
    brands: ["S/D"],
    modusOperandi: "Sin clasificar",
    context: "Casa De Familia",
    zone: "Rosario",
    aggressorMobility: "Sin clasificar",
    victimMobility: "Sin clasificar"
  },
  {
    id: "109593",
    date: "1/3/2026",
    time: "12:51:00",
    location: "Brown 1953",
    type: "Robo Simple (Art. 164)",
    description: "Me comunico con la línea 911 para radicar denuncia contra NN por hechos que pueden configurar delitos. En fecha 01/03/2026 11:45hs nos encontrabamos con mi novio, Sr. Juan Manuel Nadalini DNI: 39366433 en calle Brown 1953 Rosario. Mi pareja se encontraba parado al lado de su vehículo, cuando se acerca NN masculino en una zanella 110 negra y le dice que: \"se le perdió algo debajo del auto\", en ese momento de distracción aprovecha y le roba la cadena clasica, larguita, sin dije. NN masculino: con casco negro, ojotas rojas y una musculosa. Contextura delgada, tez morena. Escapa por calle Brow, dobla en calle Moreno y Jujuy, luego perdimos visibilidad. Nosotros lo seguimos con el auto. No hay lesionados Desconozco si hay cámaras en la zona. .",
    objects: ["Cadena"],
    brands: ["Clasica"],
    modusOperandi: "Arrebato",
    context: "Vía pública",
    zone: "Rosario",
    aggressorMobility: "Sin clasificar",
    victimMobility: "Persona"
  }
];

export const statsByZone = [
  { 
    name: "Zona A", 
    crimes: 15, 
    objects: "Celulares, Dinero", 
    brands: [
      { name: "Samsung", count: 124 },
      { name: "iPhone", count: 98 },
      { name: "Motorola", count: 56 }
    ] 
  },
  { 
    name: "Zona B", 
    crimes: 8, 
    objects: "Bicicletas", 
    brands: [
      { name: "Trek", count: 45 },
      { name: "Specialized", count: 32 },
      { name: "Giant", count: 18 }
    ] 
  },
  { 
    name: "Zona C", 
    crimes: 12, 
    objects: "Autos, Billeteras", 
    brands: [
      { name: "Toyota", count: 22 },
      { name: "VW", count: 15 },
      { name: "Ford", count: 12 }
    ] 
  },
  { 
    name: "Zona D", 
    crimes: 5, 
    objects: "Ropa", 
    brands: [
      { name: "Nike", count: 67 },
      { name: "Adidas", count: 54 },
      { name: "Puma", count: 21 }
    ] 
  },
];

export const stolenObjectsRanking = [
  { name: "Celulares", count: 450, color: "#3C4C9A" },
  { name: "Bicicletas", count: 280, color: "#D0234F" },
  { name: "Dinero/Billeteras", count: 210, color: "#EE751E" },
  { name: "Autos/Motos", count: 180, color: "#4A4963" },
  { name: "Ropa/Calzado", count: 120, color: "#6366f1" },
  { name: "Herramientas", count: 44, color: "#8b5cf6" },
];

export const mobilityData = [
  { type: "Moto", agresor: 65, victima: 15 },
  { type: "A pie", agresor: 20, victima: 45 },
  { type: "Auto", agresor: 10, victima: 30 },
  { type: "Bicicleta", agresor: 5, victima: 10 },
];

export const mobilityMatrix = [
  { aggressor: "Moto", victim: "A pie", count: 145, intensity: 0.9 },
  { aggressor: "Moto", victim: "Auto", count: 32, intensity: 0.3 },
  { aggressor: "A pie", victim: "A pie", count: 54, intensity: 0.5 },
  { aggressor: "A pie", victim: "Estacionado", count: 88, intensity: 0.7 },
  { aggressor: "Bicicleta", victim: "A pie", count: 21, intensity: 0.2 },
  { aggressor: "Auto", victim: "Auto", count: 12, intensity: 0.1 },
];

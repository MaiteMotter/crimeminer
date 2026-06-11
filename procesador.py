import geopandas as gpd
import os
import json

def procesar_geometrias():
    print("--- CrimeMiner AI: Optimizador de Capas ---")
    
    # Buscamos el archivo en diferentes carpetas comunes
    POSIBLES_RUTAS = [
        'cuadriculas.gpkg',
        'public/cuadriculas.gpkg',
        'barrios.gpkg',
        'public/barrios.gpkg'
    ]
    
    input_file = None
    for ruta in POSIBLES_RUTAS:
        if os.path.exists(ruta):
            input_file = ruta
            break
    
    output_file = 'public/cuadriculas.geojson'

    if not input_file:
        print("❌ ERROR: No se encontró 'barrios.gpkg'.")
        print("Asegúrate de que el archivo esté en la carpeta raíz o dentro de 'public'.")
        return

    try:
        print(f"✅ Mapa encontrado en: {input_file}")
        print(f"📂 Abriendo archivo...")
        # Leemos el GPKG
        gdf = gpd.read_file(input_file, engine='pyogrio')

        print(f"🗺️ Capa detectada con {len(gdf)} polígonos.")

        # 1. Asegurar coordenadas WGS84 (Lat/Lng estándar para la web)
        # Detección inteligente: si las coordenadas son > 180, definitivamente no son Lat/Lng
        min_x, min_y, max_x, max_y = gdf.total_bounds
        print(f"📊 Límites detectados: X[{min_x}, {max_x}], Y[{min_y}, {max_y}]")
        
        es_grado = (abs(min_x) <= 180 and abs(max_x) <= 180 and abs(min_y) <= 90 and abs(max_y) <= 90)

        if not es_grado:
            print("🔄 Coordenadas fuera de rango Lat/Lng. Detectadas como métricas.")
            if gdf.crs is None:
                print("⚠️ Sin CRS definido. Intentando con EPSG:22185 (Gauss-Krüger Argentina Zona 5)...")
                gdf.crs = "EPSG:22185"
            else:
                print(f"📍 CRS actual: {gdf.crs}")
            
            print("🚀 Convirtiendo a EPSG:4326 (WGS84)...")
            gdf = gdf.to_crs(epsg=4326)
        else:
            print("✅ Las coordenadas ya están en grados.")
            if gdf.crs is None:
                gdf.crs = "EPSG:4326"
            elif gdf.crs != "EPSG:4326":
                print(f"🔄 Normalizando de {gdf.crs} a EPSG:4326...")
                gdf = gdf.to_crs(epsg=4326)

        # 2. Limpieza de datos: Buscamos la mejor columna para el nombre
        print("🧹 Buscando columna de nombres de barrios...")
        columnas_nombres = [c for c in gdf.columns if any(p in c.upper() for p in ['CUADRANTE', 'CUADRICULA', 'NOMBRE_BARRIO', 'BARRIO', 'NBR', 'NAME', 'BAR', 'NOM'])]
        
        if columnas_nombres:
            col_target = columnas_nombres[0]
            print(f"📌 Usando columna '{col_target}' para los nombres.")
            # Creamos una columna estándar 'nombre_barrio' para que el Dashboard no falle
            gdf['nombre_barrio'] = gdf[col_target].astype(str).str.upper().str.strip()
            # Nos quedamos solo con lo necesario
            gdf = gdf[['nombre_barrio', 'geometry']]
        
        # Eliminar geometrías vacías o nulas
        gdf = gdf[gdf.geometry.notnull()]
        
        # 3. Guardar en la carpeta public
        if not os.path.exists('public'):
            os.makedirs('public')

        print(f"💾 Guardando resultado en: {output_file}")
        gdf.to_file(output_file, driver='GeoJSON')
        
        print("\n✅ ¡TODO LISTO!")
        print(f"Ahora verás un archivo llamado 'cuadriculas.geojson' dentro de la carpeta 'public'.")
        print("Ese es el archivo que CrimeMiner AI leerá automáticamente.")

    except Exception as e:
        print(f"💥 Error durante el proceso: {e}")

if __name__ == "__main__":
    procesar_geometrias()

import geopandas as gpd
import os
import json

import geopandas as gpd
import os
import glob

def procesar_geometrias():
    print("--- CrimeMiner AI: Optimizador de Capas (Modo Lote) ---")
    
    # 1. Buscamos archivos GPKG individuales o en lote
    rutas_gpkg = []
    
    # Buscar en public/gepgeojson/ si existe
    gpkg_dir = os.path.join('public', 'gepgeojson')
    if os.path.exists(gpkg_dir):
        rutas_gpkg.extend(glob.glob(os.path.join(gpkg_dir, '*.gpkg')))
        
    # También buscar en la raíz y carpetas comunes por compatibilidad
    for ruta in ['cuadriculas.gpkg', 'public/cuadriculas.gpkg', 'barrios.gpkg', 'public/barrios.gpkg']:
        if os.path.exists(ruta):
            rutas_gpkg.append(ruta)
            
    # Eliminar duplicados manteniendo el orden
    rutas_gpkg = list(dict.fromkeys(rutas_gpkg))
    
    if not rutas_gpkg:
        print("❌ ERROR: No se encontró ningún archivo '.gpkg'.")
        print("Asegúrate de que tus archivos estén en la carpeta raíz o dentro de 'public/gepgeojson'.")
        return

    print(f"📂 Se detectaron {len(rutas_gpkg)} archivos GPKG para procesar:")
    for r in rutas_gpkg:
        print(f"  - {r}")
        
    for input_file in rutas_gpkg:
        # Definir nombre de salida
        if 'gepgeojson' in input_file:
            # Reemplazar extensión gpkg por geojson en la misma carpeta
            output_file = input_file.replace('.gpkg', '.geojson')
        else:
            # Caso base para compatibilidad histórica de Rosario
            output_file = 'public/cuadriculas.geojson'
            
        print(f"\n🔄 Procesando: {input_file} -> {output_file}...")
        
        try:
            # Leemos el GPKG
            gdf = gpd.read_file(input_file, engine='pyogrio')
            print(f"  🗺️ Capa detectada con {len(gdf)} polígonos.")

            # 1. Asegurar coordenadas WGS84 (Lat/Lng estándar para la web)
            min_x, min_y, max_x, max_y = gdf.total_bounds
            es_grado = (abs(min_x) <= 180 and abs(max_x) <= 180 and abs(min_y) <= 90 and abs(max_y) <= 90)

            if not es_grado:
                if gdf.crs is None:
                    gdf.crs = "EPSG:22185"  # Gauss-Krüger Argentina Zona 5 por defecto
                gdf = gdf.to_crs(epsg=4326)
            else:
                if gdf.crs is None:
                    gdf.crs = "EPSG:4326"
                elif gdf.crs != "EPSG:4326":
                    gdf = gdf.to_crs(epsg=4326)

            # 2. Limpieza de datos: Buscamos la mejor columna para el nombre
            columnas_nombres = [c for c in gdf.columns if any(p in c.upper() for p in ['CUADRANTE', 'CUADRICULA', 'NOMBRE_BARRIO', 'BARRIO', 'NBR', 'NAME', 'BAR', 'NOM'])]
            
            if columnas_nombres:
                col_target = columnas_nombres[0]
                # Creamos una columna estándar 'nombre_barrio' para que el Dashboard no falle
                gdf['nombre_barrio'] = gdf[col_target].astype(str).str.upper().str.strip()
                # Nos quedamos solo con lo necesario para que el archivo sea super liviano
                gdf = gdf[['nombre_barrio', 'geometry']]
            else:
                # Si no encontramos columna de nombre, creamos una por defecto numérica
                gdf['nombre_barrio'] = [f"ZONA {i+1}" for i in range(len(gdf))]
                gdf = gdf[['nombre_barrio', 'geometry']]
            
            # Eliminar geometrías vacías o nulas
            gdf = gdf[gdf.geometry.notnull()]
            
            # Crear directorio si no existe
            out_dir = os.path.dirname(output_file)
            if out_dir and not os.path.exists(out_dir):
                os.makedirs(out_dir)

            gdf.to_file(output_file, driver='GeoJSON')
            print(f"  💾 Guardado con éxito en: {output_file}")

        except Exception as e:
            print(f"  💥 Error procesando {input_file}: {e}")
            
    print("\n✅ ¡TODAS LAS CAPAS FUERON OPTIMIZADAS CON ÉXITO!")
    print("Los archivos '.geojson' correspondientes ya están listos para ser leídos por CrimeMiner.")

if __name__ == "__main__":
    procesar_geometrias()

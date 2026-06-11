export const pythonImplementation = `
import pandas as pd
import spacy
import re
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import KMeans
from gensim import corpora, models

# 1. PREPROCESAMIENTO
# Cargar modelo de spaCy para español
nlp = spacy.load("es_core_news_sm")

def preprocess_text(text):
    # Limpieza básica
    text = text.lower()
    text = re.sub(r'[^a-záéíóúñ\\s]', '', text)
    
    # Lematización y eliminación de stopwords
    doc = nlp(text)
    tokens = [token.lemma_ for token in doc if not token.is_stop and len(token.text) > 2]
    return " ".join(tokens)

# 2. EXTRACCIÓN DE ENTIDADES (NER)
def extract_entities(text):
    doc = nlp(text)
    entities = {
        "lugares": [ent.text for ent in doc.ents if ent.label_ == "LOC"],
        "objetos": [], # Se puede mejorar con un diccionario de objetos comunes
        "modus_operandi": []
    }
    return entities

# 3. DETECCIÓN DE PATRONES (CLUSTERING)
def detect_patterns(df):
    vectorizer = TfidfVectorizer(max_features=1000)
    X = vectorizer.fit_transform(df['cleaned_text'])
    
    # Agrupar en 5 clusters
    kmeans = KMeans(n_clusters=5, random_state=42)
    df['cluster'] = kmeans.fit_predict(X)
    return df

# 4. MODELADO DE TÓPICOS (LDA)
def run_lda(texts, num_topics=3):
    tokenized_texts = [text.split() for text in texts]
    dictionary = corpora.Dictionary(tokenized_texts)
    corpus = [dictionary.doc2bow(text) for text in tokenized_texts]
    
    lda_model = models.LdaModel(corpus, num_topics=num_topics, id2word=dictionary, passes=15)
    return lda_model.print_topics()

# EJEMPLO DE USO
if __name__ == "__main__":
    # Simulación de carga de datos
    data = {
        'descripcion': [
            "Robo de celular en la parada de bus usando arma blanca",
            "Hurto de bicicleta en el parque central por descuido",
            "Estafa telefónica simulando ser del banco",
            "Arrebato de cartera por sujeto en moto",
            "Ingreso a vivienda por rotura de ventana"
        ]
    }
    df = pd.DataFrame(data)
    
    print("Preprocesando...")
    df['cleaned_text'] = df['descripcion'].apply(preprocess_text)
    
    print("Detectando patrones...")
    df = detect_patterns(df)
    
    print("Tópicos identificados:")
    topics = run_lda(df['cleaned_text'].tolist())
    for topic in topics:
        print(topic)
`;

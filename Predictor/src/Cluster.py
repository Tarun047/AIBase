import pandas as pd
from sklearn.cluster import DBSCAN, KMeans
from sklearn.preprocessing import StandardScaler
from zeugma.embeddings import EmbeddingTransformer

# Pre-processing Section

df = pd.read_csv("data3.csv")
df['endpoint'] = df['endpoint'].apply(lambda x: x.replace("/", " ").replace("{", "").replace("}", ""))
X = df['endpoint'].values.tolist()
'''X = (df['api']+df['description']).values.tolist()'''
vectorizer = EmbeddingTransformer('glove')
X = vectorizer.fit_transform(X)
# Training K-Means
# model = KMeans()
# model.fit(X)
# model = KMeans(n_clusters=10)
model = DBSCAN(eps=0.6, min_samples=3)
model.fit(X)
print(model.labels_)

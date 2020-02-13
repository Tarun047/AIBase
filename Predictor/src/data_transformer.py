import pandas as pd

df = pd.read_csv("data.csv")
df['endpoint'] = df.pop(' path')
df['http_method'] = df.pop('operation')
df['description'] = df.pop(' description')
df.pop(' request')
df.pop(' response')

df.to_csv("data3.csv", index=False)

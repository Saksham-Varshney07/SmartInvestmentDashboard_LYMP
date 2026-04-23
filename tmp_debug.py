import pandas as pd
import numpy as np

# Mocking the raw df from yfinance
df = pd.DataFrame({
    'Open': [1,2],
    'High': [1,2],
    'Low': [1,2],
    'Close': [1,2],
    'Volume': [1,2],
    'Symbol': ['BAJ', 'BAJ'],
    'Date': pd.date_range('2023-01-01', periods=2)
})

def preprocess_data(df):
    df.sort_values(by=['Symbol', 'Date'], ascending=[True, True], inplace=True)
    df.drop_duplicates(subset=['Symbol', 'Date'], keep='last', inplace=True)
    df = df.groupby('Symbol', group_keys=False).apply(lambda group: group.ffill().bfill())
    df.reset_index(drop=True, inplace=True)
    return df

cleaned_df = preprocess_data(df)
print(cleaned_df.columns)

import json
import random
import os
from datasets import load_dataset
import pandas as pd

def fetch_and_prepare_data():
    print("Loading GPQA Diamond dataset...")
    dataset = load_dataset("Idavidrein/gpqa", "gpqa_diamond", split="train")
    df = dataset.to_pandas()
    
    # Select 10 random questions
    sample_df = df.sample(n=10)
    
    questions = []
    for idx, row in sample_df.iterrows():
        options = [
            row['Correct Answer'],
            row['Incorrect Answer 1'],
            row['Incorrect Answer 2'],
            row['Incorrect Answer 3']
        ]
        random.shuffle(options)
        
        correct_index = options.index(row['Correct Answer'])
        correct_letter = chr(65 + correct_index) # 65 is 'A'
        
        subject = row['Subdomain']
        emoji = "🧬" if "Biology" in subject or "Genetics" in subject else "⚛️" if "Physics" in subject else "🧪"
        
        questions.append({
            "id": int(idx),
            "question": row['Question'],
            "subject": subject,
            "emoji": emoji,
            "options": {
                "A": options[0],
                "B": options[1],
                "C": options[2],
                "D": options[3]
            },
            "correct_letter": correct_letter,
            "explanation": row['Explanation']
        })
        
    os.makedirs(os.path.dirname(os.path.abspath(__file__)), exist_ok=True)
    with open(os.path.join(os.path.dirname(__file__), 'questions.json'), 'w', encoding='utf-8') as f:
        json.dump(questions, f, indent=2)
    print("Successfully wrote 10 questions to data/questions.json")

if __name__ == "__main__":
    fetch_and_prepare_data()
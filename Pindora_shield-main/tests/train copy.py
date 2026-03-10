import numpy as np
import pandas as pd
from rdkit import Chem
from rdkit.Chem import rdFingerprintGenerator

df = pd.read_csv("tests/use.csv")
morgan_gen = rdFingerprintGenerator.GetMorganGenerator(
    radius=2,
    fpSize=2048
)

def smiles_to_fp(smiles):
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return None
    fp = morgan_gen.GetFingerprint(mol)
    return np.array(fp)

y_ic50 = np.log10(df["ic50_value"].values)
y_association = np.log10(df["association_score"].values)
y_max_phase = df["max_phase"].values
y_target = df["target_symbol"].values

X = np.vstack(
    df["smiles"].apply(smiles_to_fp).dropna().values
)
import numpy as np
import joblib

from catboost import CatBoostRegressor, CatBoostClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import r2_score, accuracy_score
import numpy as np
import optuna
import joblib

from catboost import CatBoostRegressor, CatBoostClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import r2_score, mean_squared_error, accuracy_score

# ==================================================
# COMMON SETTINGS
# ==================================================
N_TRIALS = 10
RANDOM_SEED = 42

# ==================================================444
# 1️⃣ IC50 REGRESSION (log10 IC50)
# ==================================================
X_train, X_val, y_train, y_val = train_test_split(
    X, y_ic50, test_size=0.2, random_state=RANDOM_SEED
)

def ic50_objective(trial):
    params = {
        "iterations": trial.suggest_int("iterations", 300, 1200),
        "depth": trial.suggest_int("depth", 4, 10),
        "learning_rate": trial.suggest_float("learning_rate", 0.01, 0.3, log=True),
        "l2_leaf_reg": trial.suggest_float("l2_leaf_reg", 1e-3, 10.0, log=True),
        "loss_function": "RMSE",
        "random_seed": RANDOM_SEED,
        "verbose": 0
    }

    model = CatBoostRegressor(**params)
    model.fit(X_train, y_train, eval_set=(X_val, y_val), early_stopping_rounds=30)
    preds = model.predict(X_val)
    return np.sqrt(mean_squared_error(y_val, preds))

study = optuna.create_study(direction="minimize")
study.optimize(ic50_objective, n_trials=N_TRIALS)

ic50_model = CatBoostRegressor(**study.best_params, verbose=100)
ic50_model.fit(X_train, y_train, eval_set=(X_val, y_val), early_stopping_rounds=100)

print("IC50 R²:", r2_score(y_val, ic50_model.predict(X_val)))

joblib.dump(
    {"model": ic50_model, "radius": 2, "fp_size": 2048},
    "catboost_ic50.pkl"
)

# ==================================================
# 2️⃣ ASSOCIATION SCORE REGRESSION (log10)
# ==================================================
X_train, X_val, y_train, y_val = train_test_split(
    X, y_association, test_size=0.2, random_state=RANDOM_SEED
)

def assoc_objective(trial):
    params = {
        "iterations": trial.suggest_int("iterations", 300, 1200),
        "depth": trial.suggest_int("depth", 4, 10),
        "learning_rate": trial.suggest_float("learning_rate", 0.01, 0.3, log=True),
        "l2_leaf_reg": trial.suggest_float("l2_leaf_reg", 1e-3, 10.0, log=True),
        "loss_function": "RMSE",
        "random_seed": RANDOM_SEED,
        "verbose": 0
    }

    model = CatBoostRegressor(**params)
    model.fit(X_train, y_train, eval_set=(X_val, y_val), early_stopping_rounds=30)
    preds = model.predict(X_val)
    return np.sqrt(mean_squared_error(y_val, preds))

study = optuna.create_study(direction="minimize")
study.optimize(assoc_objective, n_trials=N_TRIALS)

association_model = CatBoostRegressor(**study.best_params, verbose=100)
association_model.fit(X_train, y_train, eval_set=(X_val, y_val), early_stopping_rounds=100)

print("Association R²:", r2_score(y_val, association_model.predict(X_val)))

joblib.dump(
    {"model": association_model, "radius": 2, "fp_size": 2048},
    "catboost_association.pkl"
)

# ==================================================
# 3️⃣ MAX CLINICAL PHASE (MULTI-CLASS)
# ==================================================
X_train, X_val, y_train, y_val = train_test_split(
    X, y_max_phase, test_size=0.2, random_state=RANDOM_SEED
)

def phase_objective(trial):
    params = {
        "iterations": trial.suggest_int("iterations", 300, 1000),
        "depth": trial.suggest_int("depth", 4, 10),
        "learning_rate": trial.suggest_float("learning_rate", 0.01, 0.3, log=True),
        "loss_function": "MultiClass",
        "random_seed": RANDOM_SEED,
        "verbose": 0
    }

    model = CatBoostClassifier(**params)
    model.fit(X_train, y_train, eval_set=(X_val, y_val), early_stopping_rounds=30)
    preds = model.predict(X_val)
    return 1.0 - accuracy_score(y_val, preds)

study = optuna.create_study(direction="minimize")
study.optimize(phase_objective, n_trials=N_TRIALS)

max_phase_model = CatBoostClassifier(**study.best_params, verbose=100)
max_phase_model.fit(X_train, y_train, eval_set=(X_val, y_val), early_stopping_rounds=100)

print("Max Phase Accuracy:", accuracy_score(y_val, max_phase_model.predict(X_val)))

joblib.dump(
    {"model": max_phase_model, "radius": 2, "fp_size": 2048},
    "catboost_max_phase.pkl"
)

# ==================================================
# 4️⃣ TARGET SYMBOL (MULTI-CLASS + LABEL ENCODER)
# ==================================================
label_encoder = LabelEncoder()
y_target_enc = label_encoder.fit_transform(y_target)

X_train, X_val, y_train, y_val = train_test_split(
    X, y_target_enc, test_size=0.2, random_state=RANDOM_SEED
)

def target_objective(trial):
    params = {
        "iterations": trial.suggest_int("iterations", 300, 1200),
        "depth": trial.suggest_int("depth", 6, 12),
        "learning_rate": trial.suggest_float("learning_rate", 0.01, 0.3, log=True),
        "loss_function": "MultiClass",
        "random_seed": RANDOM_SEED,
        "verbose": 0
    }

    model = CatBoostClassifier(**params)
    model.fit(X_train, y_train, eval_set=(X_val, y_val), early_stopping_rounds=30)
    preds = model.predict(X_val)
    return 1.0 - accuracy_score(y_val, preds)

study = optuna.create_study(direction="minimize")
study.optimize(target_objective, n_trials=N_TRIALS)

target_model = CatBoostClassifier(**study.best_params, verbose=100)
target_model.fit(X_train, y_train, eval_set=(X_val, y_val), early_stopping_rounds=100)

print("Target Accuracy:", accuracy_score(y_val, target_model.predict(X_val)))

joblib.dump(
    {
        "model": target_model,
        "label_encoder": label_encoder,
        "radius": 2,
        "fp_size": 2048
    },
    "catboost_target.pkl"
)

print("✅ ALL 4 MODELS TUNED, TRAINED & SAVED SUCCESSFULLY")

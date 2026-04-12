"""
Data Service Layer - Handles data processing, storage, and retrieval
"""
import os
import json
import uuid
from datetime import datetime
from typing import Optional, Tuple, Dict, Any, List
import pandas as pd
import io
from pathlib import Path


class DataService:
    """Service for managing and processing data"""
    
    def __init__(self):
        """Initialize data service"""
        self.datasets: Dict[str, pd.DataFrame] = {}
        self.metadata: Dict[str, Dict[str, Any]] = {}
        # Use OS-appropriate temp directory
        if os.name == 'nt':  # Windows
            self.data_dir = Path(os.environ.get('TEMP', 'C:\\temp')) / 'datasets'
        else:  # Unix/Linux/Mac
            self.data_dir = Path("/tmp/datasets")
        self.data_dir.mkdir(parents=True, exist_ok=True)
    
    async def upload_dataset(
        self,
        filename: str,
        content: bytes,
    ) -> Tuple[str, Dict[str, Any]]:
        """
        Upload and parse a dataset
        
        Args:
            filename: Original filename
            content: File content as bytes
        
        Returns:
            Tuple of (dataset_id, metadata)
        """
        try:
            # Validate content
            if not content or len(content) == 0:
                raise ValueError("File is empty")
            
            # Generate unique dataset ID
            dataset_id = str(uuid.uuid4())[:8]
            
            print(f"[v0] Processing file: {filename} ({len(content)} bytes)")
            
            # Detect file type and parse
            try:
                if filename.endswith('.csv'):
                    try:
                        df = pd.read_csv(io.BytesIO(content), encoding='utf-8')
                    except UnicodeDecodeError:
                        # Fallback to latin-1 if utf-8 fails
                        df = pd.read_csv(io.BytesIO(content), encoding='latin-1')
                elif filename.endswith('.xlsx'):
                    df = pd.read_excel(io.BytesIO(content), engine='openpyxl')
                elif filename.endswith('.xls'):
                    df = pd.read_excel(io.BytesIO(content), engine='xlrd')
                else:
                    raise ValueError(f"Unsupported file type: {filename}. Supported: .csv, .xlsx, .xls")
            except Exception as e:
                if "Unsupported file type" in str(e):
                    raise
                raise ValueError(f"Failed to parse file: {str(e)}")
            
            # Validate dataframe
            if df.empty:
                raise ValueError("Uploaded file contains no data")
            
            if len(df.columns) == 0:
                raise ValueError("Uploaded file has no columns")
            
            print(f"[v0] Successfully read file: {df.shape[0]} rows, {df.shape[1]} columns")
            
            # Clean up column names (remove leading/trailing whitespace)
            df.columns = df.columns.str.strip()
            
            # Store dataset
            self.datasets[dataset_id] = df
            
            # Generate metadata
            info = self._generate_dataset_info(dataset_id, filename, df)
            self.metadata[dataset_id] = info
            
            # Save to disk
            try:
                save_path = self.data_dir / f"{dataset_id}.parquet"
                df.to_parquet(save_path, engine='pyarrow')
                print(f"[v0] Saved dataset to parquet: {save_path}")
            except Exception as e:
                print(f"[v0] Warning: Could not save parquet file: {str(e)}. Data still available in memory.")
            
            print(f"[v0] Dataset uploaded successfully: {dataset_id}")
            
            return dataset_id, info
        except Exception as e:
            print(f"[v0] Dataset upload error: {str(e)}")
            import traceback
            traceback.print_exc()
            raise
    
    def get_dataset(self, dataset_id: str) -> Optional[pd.DataFrame]:
        """Retrieve dataset by ID"""
        return self.datasets.get(dataset_id)

    def has_dataset(self, dataset_id: str) -> bool:
        """True if this id is loaded (avoid `if df` on DataFrame — ambiguous in pandas)."""
        return dataset_id in self.datasets
    
    def get_dataset_info(self, dataset_id: str) -> Optional[Dict[str, Any]]:
        """Get metadata about a dataset"""
        return self.metadata.get(dataset_id)
    
    def _generate_dataset_info(
        self,
        dataset_id: str,
        filename: str,
        df: pd.DataFrame,
    ) -> Dict[str, Any]:
        """Generate metadata for a dataset"""
        
        column_info = []
        for col in df.columns:
            try:
                # Get sample values, handling different data types
                sample_data = df[col].dropna().head(3)
                
                # Convert numpy/pandas types to native Python types for JSON serialization
                sample_values = []
                for val in sample_data.values:
                    try:
                        # Handle different data types
                        if val is None or (hasattr(val, '__float__') and pd.isna(val)):
                            sample_values.append(None)
                        elif isinstance(val, (int, float, bool, str)):
                            sample_values.append(val)
                        elif hasattr(val, 'item'):  # numpy scalar
                            sample_values.append(val.item())
                        elif isinstance(val, pd.Timestamp):
                            sample_values.append(val.isoformat())
                        else:
                            # Fallback to string representation
                            sample_values.append(str(val))
                    except Exception as e:
                        print(f"[v0] Error converting value {val}: {str(e)}")
                        sample_values.append(str(val))
                
                column_info.append({
                    "name": str(col),
                    "dtype": str(df[col].dtype),
                    "null_count": int(df[col].isnull().sum()),
                    "unique_count": int(df[col].nunique()),
                    "sample_values": sample_values,
                })
            except Exception as e:
                print(f"[v0] Error processing column {col}: {str(e)}")
                column_info.append({
                    "name": str(col),
                    "dtype": str(df[col].dtype),
                    "null_count": int(df[col].isnull().sum()),
                    "unique_count": 0,
                    "sample_values": [],
                })
        
        return {
            "dataset_id": dataset_id,
            "filename": filename,
            "rows": int(len(df)),
            "columns": int(len(df.columns)),
            "column_info": column_info,
            "size_bytes": int(df.memory_usage(deep=True).sum()),
            "created_at": datetime.now().isoformat(),
        }
    
    def list_datasets(self) -> List[Dict[str, Any]]:
        """List all uploaded datasets"""
        return list(self.metadata.values())
    
    def delete_dataset(self, dataset_id: str) -> bool:
        """Delete a dataset"""
        try:
            if dataset_id in self.datasets:
                del self.datasets[dataset_id]
            if dataset_id in self.metadata:
                del self.metadata[dataset_id]
            
            save_path = self.data_dir / f"{dataset_id}.parquet"
            if save_path.exists():
                save_path.unlink()
            
            return True
        except Exception as e:
            print(f"[v0] Error deleting dataset: {str(e)}")
            return False
    
    def build_llm_dataset_context(
        self,
        dataset_id: str,
        max_preview_rows: int = 18,
        max_total_chars: int = 14000,
    ) -> Optional[str]:
        """
        Compact text snapshot of the dataframe for LLM prompts (preview + summaries).
        """
        df = self.get_dataset(dataset_id)
        if df is None:
            return None

        work = df.copy()
        max_cols = 35
        if len(work.columns) > max_cols:
            work = work.iloc[:, :max_cols]

        lines: List[str] = []
        lines.append(f"(Showing up to {max_preview_rows} rows; truncated if very wide.)")
        lines.append("=== Row preview (CSV) ===")
        lines.append(work.head(max_preview_rows).to_csv(index=False))

        num_cols = work.select_dtypes(include=["number"]).columns.tolist()
        if num_cols:
            desc_cols = num_cols[:20]
            lines.append("\n=== Numeric describe() ===")
            lines.append(work[desc_cols].describe(include="all").to_string())

        for col in work.select_dtypes(include=["object", "string", "category"]).columns[:12]:
            try:
                vc = work[col].astype("string").value_counts(dropna=True).head(8)
                lines.append(f"\n=== {col} top values ===")
                lines.append(vc.to_string())
            except Exception:
                continue

        text = "\n".join(lines)
        if len(text) > max_total_chars:
            text = text[:max_total_chars] + "\n... [truncated for size]"
        return text

    def get_column_stats(
        self,
        dataset_id: str,
        column: str,
    ) -> Dict[str, Any]:
        """Get detailed statistics for a specific column"""
        df = self.get_dataset(dataset_id)
        if df is None or column not in df.columns:
            return {}
        
        col_data = df[column].dropna()
        
        stats = {
            "column": column,
            "dtype": str(df[column].dtype),
            "count": len(col_data),
            "null_count": df[column].isnull().sum(),
        }
        
        # Add numeric stats if applicable
        if pd.api.types.is_numeric_dtype(col_data):
            stats.update({
                "mean": float(col_data.mean()),
                "median": float(col_data.median()),
                "std": float(col_data.std()),
                "min": float(col_data.min()),
                "max": float(col_data.max()),
            })
        else:
            # For categorical data
            stats.update({
                "unique_count": col_data.nunique(),
                "mode": str(col_data.mode()[0]) if len(col_data.mode()) > 0 else None,
            })
        
        return stats

    def build_chart_payload(self, dataset_id: str) -> Optional[Dict[str, Any]]:
        """
        Build chart-ready aggregates for the analytics UI (Recharts-friendly).
        """
        df = self.get_dataset(dataset_id)
        if df is None or df.empty:
            return None

        num_cols = df.select_dtypes(include=["number"]).columns.tolist()
        cat_candidates: List[str] = []
        for c in df.columns:
            if c in num_cols:
                continue
            try:
                nu = int(df[c].nunique(dropna=True))
            except Exception:
                continue
            if 2 <= nu <= 14:
                cat_candidates.append(str(c))

        out: Dict[str, Any] = {}

        if num_cols:
            col = num_cols[0]
            series_df = df[[col]].dropna().head(100)
            out["line"] = {
                "title": f"{col} by row index",
                "data": [
                    {"x": i + 1, "y": float(v)}
                    for i, v in enumerate(series_df[col].values)
                    if pd.notna(v)
                ],
            }

        if cat_candidates:
            c = cat_candidates[0]
            vc = df[c].value_counts(dropna=True).head(10)
            out["bar"] = {
                "title": f"Top values — {c}",
                "data": [{"name": str(k)[:40], "value": int(v)} for k, v in vc.items()],
            }

        if len(num_cols) >= 2:
            c0, c1 = num_cols[0], num_cols[1]
            pair = df[[c0, c1]].dropna().head(120)
            out["scatter"] = {
                "title": f"{c0} vs {c1}",
                "data": [
                    {"x": float(r[c0]), "y": float(r[c1])}
                    for _, r in pair.iterrows()
                    if pd.notna(r[c0]) and pd.notna(r[c1])
                ],
            }

        if num_cols and cat_candidates:
            try:
                c_cat = cat_candidates[0]
                c_num = num_cols[0]
                g = df.groupby(c_cat, dropna=True)[c_num].mean().sort_values(ascending=False).head(10)
                out["grouped_bar"] = {
                    "title": f"Average {c_num} by {c_cat}",
                    "data": [{"name": str(k)[:40], "value": float(v)} for k, v in g.items()],
                }
            except Exception:
                pass

        if num_cols:
            col = num_cols[0]
            s = df[col].dropna().head(200).cumsum()
            out["area"] = {
                "title": f"Cumulative {col}",
                "data": [{"x": i + 1, "y": float(v)} for i, v in enumerate(s.values) if pd.notna(v)],
            }

        return out

    def build_comparison_snapshot(
        self,
        dataset_id_1: str,
        dataset_id_2: str,
    ) -> Optional[Dict[str, Any]]:
        """Structured side-by-side facts for comparing two datasets."""
        df1 = self.get_dataset(dataset_id_1)
        df2 = self.get_dataset(dataset_id_2)
        info1 = self.get_dataset_info(dataset_id_1)
        info2 = self.get_dataset_info(dataset_id_2)
        if df1 is None or df2 is None or not info1 or not info2:
            return None

        cols1 = set(df1.columns.astype(str))
        cols2 = set(df2.columns.astype(str))
        shared = sorted(cols1 & cols2)
        only1 = sorted(cols1 - cols2)
        only2 = sorted(cols2 - cols1)

        null1 = int(df1.isnull().sum().sum())
        null2 = int(df2.isnull().sum().sum())
        cells1 = int(df1.shape[0] * df1.shape[1])
        cells2 = int(df2.shape[0] * df2.shape[1])
        comp1 = round((1 - null1 / max(cells1, 1)) * 100, 1)
        comp2 = round((1 - null2 / max(cells2, 1)) * 100, 1)

        num1 = df1.select_dtypes(include=["number"]).columns.tolist()
        num2 = df2.select_dtypes(include=["number"]).columns.tolist()
        shared_numeric = sorted(set(num1) & set(num2))

        side_by_side_numeric: List[Dict[str, Any]] = []
        for col in shared_numeric[:12]:
            try:
                a = df1[col].dropna()
                b = df2[col].dropna()
                if len(a) == 0 and len(b) == 0:
                    continue
                side_by_side_numeric.append({
                    "column": col,
                    "dataset_1_mean": float(a.mean()) if len(a) else None,
                    "dataset_2_mean": float(b.mean()) if len(b) else None,
                    "dataset_1_sum": float(a.sum()) if len(a) else None,
                    "dataset_2_sum": float(b.sum()) if len(b) else None,
                })
            except Exception:
                continue

        return {
            "dataset_1": {
                "id": dataset_id_1,
                "filename": info1.get("filename"),
                "rows": int(info1.get("rows", 0)),
                "columns": int(info1.get("columns", 0)),
                "completeness_pct": comp1,
            },
            "dataset_2": {
                "id": dataset_id_2,
                "filename": info2.get("filename"),
                "rows": int(info2.get("rows", 0)),
                "columns": int(info2.get("columns", 0)),
                "completeness_pct": comp2,
            },
            "schema": {
                "shared_columns": shared,
                "only_in_dataset_1": only1[:40],
                "only_in_dataset_2": only2[:40],
                "shared_numeric_columns": shared_numeric,
            },
            "numeric_comparison": side_by_side_numeric,
        }

    def build_numeric_describe_block(self, dataset_id: str, max_chars: int = 12000) -> str:
        """Pandas describe() for numeric columns — for formal reports."""
        df = self.get_dataset(dataset_id)
        if df is None:
            return ""
        num = df.select_dtypes(include=["number"]).columns.tolist()
        if not num:
            return "No numeric columns available for statistical summary."
        try:
            block = df[num[:30]].describe(include="all").to_string()
        except Exception as e:
            return f"Could not compute describe(): {str(e)[:200]}"
        if len(block) > max_chars:
            return block[:max_chars] + "\n… [truncated]"
        return block

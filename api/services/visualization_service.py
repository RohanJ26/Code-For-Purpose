"""
Visualization Service - Generate charts and visualizations from data
Uses Matplotlib and returns base64 encoded images
"""
import io
import base64
import json
from typing import Dict, Any, List, Optional
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib
import seaborn as sns

# Use non-interactive backend
matplotlib.use('Agg')


class VisualizationService:
    """Service for generating data visualizations"""
    
    def __init__(self):
        """Initialize visualization service"""
        sns.set_style("whitegrid")
        plt.rcParams['figure.figsize'] = (12, 6)
        plt.rcParams['font.size'] = 10
    
    def generate_distribution_chart(
        self,
        dataset: pd.DataFrame,
        column: str,
        chart_type: str = "histogram",
    ) -> Dict[str, Any]:
        """Generate distribution chart for a column"""
        
        try:
            plt.figure(figsize=(10, 6))
            
            if chart_type == "histogram":
                dataset[column].hist(bins=30, edgecolor='black', alpha=0.7)
                plt.title(f"Distribution of {column}", fontsize=14, fontweight='bold')
                plt.xlabel(column)
                plt.ylabel("Frequency")
            elif chart_type == "boxplot":
                dataset.boxplot(column=column)
                plt.title(f"Boxplot of {column}", fontsize=14, fontweight='bold')
                plt.ylabel(column)
            elif chart_type == "density":
                dataset[column].plot(kind='density', linewidth=2)
                plt.title(f"Density Plot of {column}", fontsize=14, fontweight='bold')
                plt.xlabel(column)
            
            # Convert to base64
            image_data = self._figure_to_base64()
            plt.close()
            
            return {
                "type": "distribution",
                "chart_type": chart_type,
                "column": column,
                "image": image_data,
                "success": True,
            }
        except Exception as e:
            print(f"[v0] Distribution chart error: {str(e)}")
            plt.close()
            return {"error": str(e), "success": False}
    
    def generate_timeseries_chart(
        self,
        dataset: pd.DataFrame,
        date_column: str,
        value_column: str,
    ) -> Dict[str, Any]:
        """Generate time series chart"""
        
        try:
            plt.figure(figsize=(12, 6))
            
            # Sort by date
            df = dataset.sort_values(date_column)
            
            plt.plot(df[date_column], df[value_column], marker='o', linewidth=2, markersize=4)
            plt.title(f"{value_column} Over Time", fontsize=14, fontweight='bold')
            plt.xlabel(date_column)
            plt.ylabel(value_column)
            plt.xticks(rotation=45)
            plt.tight_layout()
            
            image_data = self._figure_to_base64()
            plt.close()
            
            return {
                "type": "timeseries",
                "date_column": date_column,
                "value_column": value_column,
                "image": image_data,
                "success": True,
            }
        except Exception as e:
            print(f"[v0] Time series chart error: {str(e)}")
            plt.close()
            return {"error": str(e), "success": False}
    
    def generate_correlation_heatmap(
        self,
        dataset: pd.DataFrame,
        columns: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """Generate correlation heatmap"""
        
        try:
            plt.figure(figsize=(10, 8))
            
            # Select numeric columns
            if columns:
                numeric_df = dataset[columns].select_dtypes(include=['number'])
            else:
                numeric_df = dataset.select_dtypes(include=['number'])
            
            # Limit to top 10 columns
            if len(numeric_df.columns) > 10:
                numeric_df = numeric_df.iloc[:, :10]
            
            correlation = numeric_df.corr()
            
            sns.heatmap(
                correlation,
                annot=True,
                fmt='.2f',
                cmap='coolwarm',
                center=0,
                square=True,
                linewidths=0.5,
            )
            
            plt.title("Correlation Heatmap", fontsize=14, fontweight='bold')
            plt.tight_layout()
            
            image_data = self._figure_to_base64()
            plt.close()
            
            return {
                "type": "heatmap",
                "image": image_data,
                "correlations": correlation.to_dict(),
                "success": True,
            }
        except Exception as e:
            print(f"[v0] Heatmap error: {str(e)}")
            plt.close()
            return {"error": str(e), "success": False}
    
    def generate_category_chart(
        self,
        dataset: pd.DataFrame,
        category_column: str,
        value_column: Optional[str] = None,
        chart_type: str = "bar",
    ) -> Dict[str, Any]:
        """Generate categorical chart (bar, pie, etc)"""
        
        try:
            plt.figure(figsize=(12, 6))
            
            if value_column:
                # Aggregate by category
                grouped = dataset.groupby(category_column)[value_column].sum().sort_values(ascending=False)
                grouped = grouped.head(15)  # Limit to top 15
            else:
                # Just count categories
                grouped = dataset[category_column].value_counts().head(15)
            
            if chart_type == "bar":
                grouped.plot(kind='bar', color='skyblue', edgecolor='black')
                plt.title(f"{category_column} Analysis", fontsize=14, fontweight='bold')
                plt.ylabel(value_column or "Count")
                plt.xlabel(category_column)
                plt.xticks(rotation=45, ha='right')
            elif chart_type == "pie":
                plt.figure(figsize=(10, 8))
                grouped.plot(kind='pie', autopct='%1.1f%%', startangle=90)
                plt.title(f"{category_column} Distribution", fontsize=14, fontweight='bold')
                plt.ylabel('')
            
            plt.tight_layout()
            
            image_data = self._figure_to_base64()
            plt.close()
            
            return {
                "type": "categorical",
                "chart_type": chart_type,
                "category_column": category_column,
                "image": image_data,
                "success": True,
            }
        except Exception as e:
            print(f"[v0] Category chart error: {str(e)}")
            plt.close()
            return {"error": str(e), "success": False}
    
    def generate_scatter_plot(
        self,
        dataset: pd.DataFrame,
        x_column: str,
        y_column: str,
        size_column: Optional[str] = None,
        color_column: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Generate scatter plot"""
        
        try:
            plt.figure(figsize=(12, 6))
            
            scatter_kwargs = {
                "alpha": 0.6,
                "edgecolors": 'w',
                "linewidth": 0.5,
            }
            
            if size_column and size_column in dataset.columns:
                scatter_kwargs["s"] = (dataset[size_column] - dataset[size_column].min()) / (dataset[size_column].max() - dataset[size_column].min()) * 300 + 20
            
            if color_column and color_column in dataset.columns:
                scatter = plt.scatter(
                    dataset[x_column],
                    dataset[y_column],
                    c=dataset[color_column],
                    cmap='viridis',
                    **scatter_kwargs
                )
                plt.colorbar(scatter, label=color_column)
            else:
                plt.scatter(dataset[x_column], dataset[y_column], **scatter_kwargs)
            
            plt.title(f"{x_column} vs {y_column}", fontsize=14, fontweight='bold')
            plt.xlabel(x_column)
            plt.ylabel(y_column)
            plt.tight_layout()
            
            image_data = self._figure_to_base64()
            plt.close()
            
            return {
                "type": "scatter",
                "x_column": x_column,
                "y_column": y_column,
                "image": image_data,
                "success": True,
            }
        except Exception as e:
            print(f"[v0] Scatter plot error: {str(e)}")
            plt.close()
            return {"error": str(e), "success": False}
    
    def generate_dashboard_summary(
        self,
        dataset: pd.DataFrame,
    ) -> Dict[str, Any]:
        """Generate a multi-panel dashboard summary"""
        
        try:
            fig, axes = plt.subplots(2, 2, figsize=(14, 10))
            fig.suptitle("Dataset Overview Dashboard", fontsize=16, fontweight='bold')
            
            # Get numeric columns
            numeric_cols = dataset.select_dtypes(include=['number']).columns.tolist()
            cat_cols = dataset.select_dtypes(include=['object']).columns.tolist()
            
            # Panel 1: Distribution of first numeric column
            if numeric_cols:
                axes[0, 0].hist(dataset[numeric_cols[0]], bins=30, edgecolor='black', alpha=0.7, color='skyblue')
                axes[0, 0].set_title(f"Distribution: {numeric_cols[0]}")
                axes[0, 0].set_ylabel("Frequency")
            
            # Panel 2: Top categories
            if cat_cols:
                top_cat = dataset[cat_cols[0]].value_counts().head(10)
                axes[0, 1].barh(range(len(top_cat)), top_cat.values, color='lightcoral')
                axes[0, 1].set_yticks(range(len(top_cat)))
                axes[0, 1].set_yticklabels(top_cat.index)
                axes[0, 1].set_title(f"Top Categories: {cat_cols[0]}")
            
            # Panel 3: Correlation heatmap
            if len(numeric_cols) > 1:
                corr = dataset[numeric_cols[:5]].corr()
                im = axes[1, 0].imshow(corr, cmap='coolwarm', aspect='auto')
                axes[1, 0].set_xticks(range(len(corr)))
                axes[1, 0].set_yticks(range(len(corr)))
                axes[1, 0].set_xticklabels(corr.columns, rotation=45, ha='right', fontsize=8)
                axes[1, 0].set_yticklabels(corr.columns, fontsize=8)
                axes[1, 0].set_title("Correlation Matrix")
            
            # Panel 4: Data info
            info_text = f"""
            Dataset Info:
            - Rows: {len(dataset):,}
            - Columns: {len(dataset.columns)}
            - Numeric: {len(numeric_cols)}
            - Categorical: {len(cat_cols)}
            - Missing: {dataset.isnull().sum().sum()} values
            """
            axes[1, 1].text(0.1, 0.5, info_text, fontsize=11, family='monospace', 
                           verticalalignment='center')
            axes[1, 1].axis('off')
            
            plt.tight_layout()
            
            image_data = self._figure_to_base64()
            plt.close()
            
            return {
                "type": "dashboard",
                "image": image_data,
                "success": True,
            }
        except Exception as e:
            print(f"[v0] Dashboard error: {str(e)}")
            plt.close()
            return {"error": str(e), "success": False}
    
    @staticmethod
    def _figure_to_base64() -> str:
        """Convert matplotlib figure to base64 encoded image"""
        buffer = io.BytesIO()
        plt.savefig(buffer, format='png', dpi=100, bbox_inches='tight')
        buffer.seek(0)
        image_base64 = base64.b64encode(buffer.read()).decode('utf-8')
        buffer.close()
        return image_base64

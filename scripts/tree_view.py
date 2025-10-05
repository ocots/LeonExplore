#!/usr/bin/env python3
import os
from pathlib import Path

class TreeView:
    def __init__(self, root_dir):
        self.root_dir = Path(root_dir).resolve()
        self.exclude_dirs = {'__pycache__', '.git', 'node_modules'}
        self.colors = {
            'dir': '\033[94m',  # Bleu pour les dossiers
            'file': '\033[0m',   # Par défaut pour les fichiers
            'reset': '\033[0m'    # Réinitialisation
        }

    def print_tree(self, path=None, prefix=''):
        """Affiche l'arborescence du répertoire de manière récursive"""
        if path is None:
            path = self.root_dir
            print(f"{self.colors['dir']}{path.name}/{self.colors['reset']}")

        items = sorted(os.listdir(path))
        items = [item for item in items if not item.startswith('.')]
        
        for i, item in enumerate(items):
            item_path = os.path.join(path, item)
            is_last = i == len(items) - 1
            
            # Déterminer le préfixe pour les éléments suivants
            connector = '└── ' if is_last else '├── '
            new_prefix = prefix + ('    ' if is_last else '│   ')
            
            if os.path.isdir(item_path) and item not in self.exclude_dirs:
                print(f"{prefix}{connector}{self.colors['dir']}{item}/{self.colors['reset']}")
                self.print_tree(item_path, new_prefix)
            else:
                print(f"{prefix}{connector}{self.colors['file']}{item}{self.colors['reset']}")

def main():
    # Chemin vers le répertoire src
    src_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'src')
    
    if not os.path.exists(src_dir):
        print(f"Erreur: Le répertoire {src_dir} n'existe pas.")
        return
    
    print(f"Arborescence du projet : {src_dir}")
    print("-" * 50)
    
    tree = TreeView(src_dir)
    tree.print_tree()
    print("\nLégende :")
    print(f"{tree.colors['dir']}Dossier{tree.colors['reset']}")
    print(f"{tree.colors['file']}Fichier{tree.colors['reset']}")

if __name__ == "__main__":
    main()

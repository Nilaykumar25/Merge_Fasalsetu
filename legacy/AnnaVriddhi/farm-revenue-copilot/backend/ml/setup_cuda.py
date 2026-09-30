"""
setup_cuda.py
Check CUDA availability and provide setup instructions
"""

import sys
import subprocess

def check_cuda():
    """Check CUDA setup and provide instructions"""
    print("="*80)
    print("CUDA SETUP CHECK")
    print("="*80)
    
    # Check Python version
    python_version = f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
    print(f"\nPython version: {python_version}")
    
    if sys.version_info.major == 3 and sys.version_info.minor >= 13:
        print("⚠️  WARNING: Python 3.13+ detected")
        print("   PyTorch with CUDA is not yet available for Python 3.13")
        print()
        print("SOLUTION: Install Python 3.11 for CUDA support")
        print()
        print("Steps:")
        print("  1. Download Python 3.11 from: https://www.python.org/downloads/")
        print("  2. Install Python 3.11 (alongside current Python)")
        print("  3. Use py -3.11 to run Python 3.11")
        print("  4. Install PyTorch with CUDA:")
        print("     py -3.11 -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121")
        print("  5. Run training with Python 3.11:")
        print("     py -3.11 backend\\ml\\train.py")
        print()
        print("ALTERNATIVE: Continue with CPU training")
        print("  - Slower (5-10 hours instead of 1-2 hours)")
        print("  - But will work with current setup")
        print("  - Command: python backend\\ml\\train.py")
        print()
    
    # Check PyTorch
    try:
        import torch
        print(f"\nPyTorch version: {torch.__version__}")
        
        cuda_available = torch.cuda.is_available()
        print(f"CUDA available: {cuda_available}")
        
        if cuda_available:
            print(f"CUDA version: {torch.version.cuda}")
            print(f"GPU count: {torch.cuda.device_count()}")
            for i in range(torch.cuda.device_count()):
                print(f"GPU {i}: {torch.cuda.get_device_name(i)}")
            print("\n✓ CUDA setup complete! Ready for GPU training.")
        else:
            if '+cu' in torch.__version__:
                print("\n⚠️  PyTorch has CUDA support but no GPU detected")
                print("   Check NVIDIA drivers")
            else:
                print("\n✗ PyTorch CPU-only version installed")
                print("   GPU training not available")
    
    except ImportError:
        print("\n✗ PyTorch not installed")
        print("   Install: pip install torch torchvision")
    
    # Check nvidia-smi
    print("\n" + "-"*80)
    print("Checking NVIDIA GPU...")
    print("-"*80)
    
    try:
        result = subprocess.run(
            ['nvidia-smi', '--query-gpu=name,memory.total,driver_version,cuda_version', 
             '--format=csv,noheader'],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode == 0:
            print("✓ NVIDIA GPU detected:")
            for line in result.stdout.strip().split('\n'):
                if line.strip():
                    parts = [p.strip() for p in line.split(',')]
                    if len(parts) >= 4:
                        print(f"  GPU: {parts[0]}")
                        print(f"  Memory: {parts[1]}")
                        print(f"  Driver: {parts[2]}")
                        print(f"  CUDA: {parts[3]}")
        else:
            print("✗ nvidia-smi failed")
    
    except FileNotFoundError:
        print("✗ nvidia-smi not found (NVIDIA drivers not installed?)")
    except Exception as e:
        print(f"✗ Error checking GPU: {e}")
    
    print("\n" + "="*80)

if __name__ == '__main__':
    check_cuda()

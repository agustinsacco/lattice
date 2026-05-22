from setuptools import setup, find_packages

setup(
    name="cad_engine",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        "build123d",
        "trimesh",
    ],
)

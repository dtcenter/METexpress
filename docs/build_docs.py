#!/usr/bin/env python3

"""
Program Name: build_docs.py
Contact(s): George McCabe
Abstract: This script does the following:
  - Generates Sphinx Gallery documentation
  - Removes unwanted text from the HTML output
History Log:  Initial version
Usage:
Parameters: None
Input Files: None
Output Files: None
Condition codes:
"""

import os
import sys
import shlex
import shutil
import subprocess
import re
import importlib

def run_command(command, dir_to_run=None):
    log_text = f"Running {command}"
    if dir_to_run:
        log_text += f" under {dir_to_run}"

    command_out = subprocess.run(shlex.split(command),
                                 cwd=dir_to_run)
    if command_out.returncode != 0:
        error_text = f"Could not create symbolic links by running {command}"
        if dir_to_run:
            error_text += f"in {dir_to_run}"
        print(error_text)
        sys.exit(1)

def main():
    build_pdf = os.environ.get('METEXPRESS_DOC_PDF')
    if build_pdf:
        print("PDF output enabled")

    # docs directory
    docs_dir = os.getcwd()

    # generated use case HTML output
    generated_dir = os.path.join(docs_dir,
                                 '_build',
                                 'html',
                                 'generated')

    # User's Guide use case HTML output
    users_guide_dir = os.path.join(docs_dir,
                                   '_build',
                                   'html',
                                   'Users_Guide')

    # run make to generate the documentation files
    run_command(f"make clean html {'pdf' if build_pdf else ''}",
                docs_dir)

    print("Documentation build completed")

if __name__ == "__main__":
    main()

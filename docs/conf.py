# Configuration file for the Sphinx documentation builder.
#
# This file only contains a selection of the most common options. For a full
# list see the documentation:
# https://www.sphinx-doc.org/en/master/usage/configuration.html

# -- Path setup --------------------------------------------------------------

# If extensions (or modules to document with autodoc) are in another directory,
# add these directories to sys.path here. If the directory is relative to the
# documentation root, use os.path.abspath to make it absolute, like shown here.
#
import os
import sys
sys.path.insert(0, os.path.abspath('.'))
print(sys.path)

# -- Project information -----------------------------------------------------

project = 'METexpress'
author = 'UCAR/NCAR, NOAA, CSU/CIRA, and CU/CIRES'
author_list = 'Strong, B., Pierce, R., Smith, M.B., Hagerty, V., Hamilton, Jeff'
verinfo = '3.0.0'
version = '3.0.0'
release = f'{version}'
release_year = '2020'
release_date = f'{release_year}XXXX'
copyright = f'{release_year}, {author}'

# -- General configuration ---------------------------------------------------

# Add any Sphinx extension module names here, as strings. They can be
# extensions coming with Sphinx (named 'sphinx.ext.*') or your custom
# ones.
extensions = ['sphinx.ext.autodoc','sphinx.ext.intersphinx']

# Add any paths that contain templates here, relative to this directory.
templates_path = ['_templates']

# List of patterns, relative to source directory, that match files and
# directories to ignore when looking for source files.
# This pattern also affects html_static_path and html_extra_path.
exclude_patterns = ['_build', 'Thumbs.db', '.DS_Store', 'Flowchart' ]

# Suppress certain warning messages
suppress_warnings = ['ref.citation']

# -- Options for HTML output -------------------------------------------------

# The theme to use for HTML and HTML Help pages.  See the documentation for
# a list of builtin themes.
#
html_theme = 'sphinx_rtd_theme'
html_css_files = ['theme_override.css']
#html_js_files = ['pop_ver.js']

# Theme options are theme-specific and customize the look and feel of a theme
# further.  For a list of options available for each theme, see the
# documentation.
#html_theme_options = {'canonical_url': 'https://dtcenter.github.io/METexpress/latest/'}
#if 'sphinx_rtd_theme' in vars() and sphinx_rtd_theme.__version__ == '0.2.5b1.post1':
#        html_theme_options['versions'] = {'latest': '../latest', 'development': '../development'}

# The name for this set of Sphinx documents.  If None, it defaults to
# "<project> v<release> documentation".
html_title = ' '.join((project, version))
        
# Add any paths that contain custom static files (such as style sheets) here,
# relative to this directory. They are copied after the builtin static files,
# so a file named "default.css" will overwrite the builtin "default.css".
html_static_path = ['_static']

# The name of an image file (relative to this directory) to place at the top
# of the sidebar.
html_logo = os.path.join('_static','met_express_logo_2019_09.png')

# -- Intersphinx control -----------------------------------------------------
#intersphinx_mapping = {'numpy':("https://docs.scipy.org/doc/numpy/", None)}

numfig = True

numfig_format = {
    'figure': 'Figure %s',
}

# -- Export variables --------------------------------------------------------

rst_epilog = """
.. |copyright|    replace:: {copyrightstr}
.. |author_list|  replace:: {author_liststr}
.. |release_date| replace:: {release_datestr}
.. |release_year| replace:: {release_yearstr}
""".format(copyrightstr    = copyright,
           author_liststr  = author_list,
           release_datestr = release_date,
           release_yearstr = release_year)

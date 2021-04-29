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
from datetime import datetime
import sys
sys.path.insert(0, os.path.abspath('.'))
print(sys.path)

# -- Project information -----------------------------------------------------

project = 'METexpress'
author = 'UCAR/NCAR, NOAA, CSU/CIRA, and CU/CIRES'
author_list = 'Strong, B., Pierce, R., Smith, M.B., Hagerty, V., Hamilton, Jeff'

# The stable version, displayed on the front page of the PDF
version = '4.1.0'
verinfo = version

# The full version, including alpha/beta/rc tags
release = f'{version}'
release_year = '2021'
release_date = f'{release_year}0331'
copyright = f'{release_year}, {author}'
release_monthyear = datetime.strptime(release_date, '%Y%m%d').strftime('%B %Y')

# -- General configuration ---------------------------------------------------

# Add any Sphinx extension module names here, as strings. They can be
# extensions coming with Sphinx (named 'sphinx.ext.*') or your custom
# ones.
extensions = ['sphinx.ext.autodoc','sphinx.ext.intersphinx']

# To enable PDF generation, set METPLUS_DOC_PDF environment variable
#  sphinx 2.4.2+ and rst2pdf packages are required
if os.environ.get('METEXPRESS_DOC_PDF'):
    extensions.append('rst2pdf.pdfbuilder')


# settings for ReadTheDocs PDF creation
latex_engine = 'pdflatex'
latex_theme = 'manual'
latex_logo = os.path.join('_static','met_express_logo_2019_09.png')
latex_show_pagerefs = 'True'
master_doc = 'Users_Guide/index'

latex_elements = {
    # The paper size ('letterpaper' or 'a4paper').
    #
    'papersize': 'letterpaper',
    'releasename':"{version}",
    'fncychap': '\\usepackage{fncychap}',
    'fontpkg': '\\usepackage{amsmath,amsfonts,amssymb,amsthm}',
                         
    'figure_align':'htbp',
    'pointsize': '11pt',
 
    'preamble': r'''
        \usepackage{charter}
        \usepackage[defaultsans]{lato}
        \usepackage{inconsolata}
     ''',
    
    'sphinxsetup': \
        'hmargin={0.7in,0.7in}, vmargin={1in,1in}, \
        verbatimwithframe=true, \
        TitleColor={rgb}{0,0,0}, \
        HeaderFamily=\\rmfamily\\bfseries, \
        InnerLinkColor={rgb}{0,0,1}, \
        OuterLinkColor={rgb}{0,0,1}',
      'maketitle': '\\sphinxmaketitle',  
      'tableofcontents': '\\sphinxtableofcontents',
      'printindex': ' '
}

# Grouping the document tree into LaTeX files. List of tuples
# (source start file, target name, title,
#  author, documentclass [howto, manual, or own class]).
latex_documents = [
    (master_doc, 
        'users_guide.tex', 
        'METexpress User\'s Guide',
        'B. Strong, R. Pierce, M. B. Smith, V. Hagerty, J. Hamilton', 
        'manual')
    ]
    
# used for generating PDF built locally
pdf_documents = [('Users_Guide/index',
                  f'METexpress_Users_Guide_v{version}',
                  'METexpress User\'s Guide', 
                  'Bonny Strong\\Randy Pierce\\Molly B. Smith\\Venita Hagerty\\Jeff Hamilton\\'
                  )]

# comma-separated list of custom stylesheets. Example:
pdf_stylesheets = ['metplus','bw']

# A list of folders to search for stylesheets. Example:
pdf_style_path = ['.', '_styles']

# Create a compressed PDF
# Use True/False or 1/0
# Example: compressed=True
pdf_compressed = False

# A colon-separated list of folders to search for fonts. Example:
pdf_font_path = ['/usr/share/fonts', '/usr/share/texmf-dist/fonts/']

# Language to be used for hyphenation support
pdf_language = "en_US"

# Mode for literal blocks wider than the frame. Can be
# overflow, shrink or truncate
pdf_fit_mode = "shrink"

# Section level that forces a break page.
# For example: 1 means top-level sections start in a new page
# 0 means disabled
pdf_break_level = 1

# When a section starts in a new page, force it to be 'even', 'odd',
# or just use 'any'
pdf_breakside = 'any'

# Insert footnotes where they are defined instead of
# at the end.
pdf_inline_footnotes = True

# verbosity level. 0 1 or 2
pdf_verbosity = 0

# If false, no index is generated.
pdf_use_index = False

# If false, no modindex is generated.
pdf_use_modindex = False

# If false, no coverpage is generated.
pdf_use_coverpage = False

# Name of the cover page template to use
#pdf_cover_template = 'sphinxcover.tmpl'

# Documents to append as an appendix to all manuals.
#pdf_appendices = []

# Enable experimental feature to split table cells. Use it
# if you get "DelayedTable too big" errors
#pdf_splittables = False

# Set the default DPI for images
pdf_default_dpi = 18

# Enable rst2pdf extension modules (default is only vectorpdf)
# you need vectorpdf if you want to use sphinx's graphviz support
#pdf_extensions = ['vectorpdf']

# Page template name for "regular" pages
pdf_page_template = 'cutePage'

# Show Table Of Contents at the beginning?
pdf_use_toc = True

# How many levels deep should the table of contents be?
pdf_toc_depth = 3

# Add section number to section references
pdf_use_numbered_links = True

# Background images fitting mode
pdf_fit_background_mode = 'scale'

##################################################################

                   
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
html_theme_path = ["_themes", ]
html_js_files = ['pop_ver.js']
html_css_files = ['theme_override.css']

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


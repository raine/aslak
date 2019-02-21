curl -s https://raw.githubusercontent.com/iamcal/emoji-data/master/emoji.json | \
  npx ramda-cli \
    'reject (.unified.includes("-"))' \
    'chain (emoji) -> emoji.short_names.map -> {...emoji, short_name: it}' \
    'sort-by (.short_name)' \
    'index-by (.short_name)' 'map -> "&\#x#{it.unified};"' \

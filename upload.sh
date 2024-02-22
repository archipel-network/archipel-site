BASE_URL="https://archipel.labolyon.fr/"

echo "Starting site update"

for filename in $(find . -type f | grep -v .git); do 
    fileurl="$BASE_URL${filename#'./'}"
    mimetype=$(file --mime-type "$filename" | cut -d' ' -f2)
    echo "$filename" "$mimetype"
    curl -n -X PUT --data-binary "@$filename" --header "Content-Type: $mimetype" "$fileurl"
done

reportjson="
{
    \"@context\": {\"@vocab\": \"http://schema.org/\", \"@language\": \"fr\"},
    \"@type\": \"UpdateAction\",
    \"result\": \"Site mise à jour\",
    \"agent\": {
        \"@type\": \"Person\",
        \"name\": \"$(whoami)\"
    },
    \"object\": {\"@id\": \"$BASE_URL\"},
    \"endTime\": \"$(date +"%Y-%m-%dT%H:%M:%S%z")\"
}
"
curl -n -X PUT --data "$reportjson" --header "Content-Type: application/json+ld" "${BASE_URL}last-update.json"
echo "Last update by $(whoami), report available at ${BASE_URL}last-update.json"
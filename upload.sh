BASE_URL="https://archipel.labolyon.fr/"

echo "Statrting site update archipel.labolyon.fr"

echo "
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
" > archipel.labolyon.fr/last-update.json

for filename in $(find ./archipel.labolyon.fr/ -type f | grep -v .git); do 
    fileurl="$BASE_URL${filename#'./archipel.labolyon.fr/'}"
    mimetype=$(file --mime-type "$filename" | cut -d' ' -f2)
    echo "$filename" "$mimetype"
    curl -n -X PUT --data-binary "@$filename" --header "Content-Type: $mimetype" "$fileurl"
done

echo "Starting site update archipelproject.net"
BASE_URL="https://archipelproject.net/"

echo "
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
" > archipelproject.net/last-update.json

rsync -av --exclude=".*" archipelproject.net/* epickiwi@archipelproject.net:/var/www/archipelproject.net/
echo "Last update by $(whoami), report available at ${BASE_URL}last-update.json"
import React, { useState, useEffect, useRef } from 'react';
import { WebView } from 'react-native-webview';
import { ActivityIndicator, TouchableOpacity, Platform, Linking, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';

//Configurações de Localização
// é um objeto (só uma informação)
const SCHOOL = {
  id: 'school',
  name: 'ETEC',
  coordinate: { latitude: -22.489209488755193, longitude: -48.54639769410305},
  address: 'Rua Ludovico Victório, 2140, Barra Bonita - SP' 
}

//é um vetor (várias informações)
const BUS_STOPS = [
  {
    id: 'stop_1',
    name: 'Autoescola Muriano',
    address: 'R. Geraldo Fazzio, 484',
    coordinate: { latitude: -22.484265378520426, longitude: -48.56480125015802 },
    lines: ['Nova Barra'],
  },
]

  //Distância Haversine (metros)
  function getDistance(c1, c2) {
    const R = 6371e3;
    const q1 = (c1.latitude * Math.PI) / 180;
    const q2 = (c2.latitude * Math.PI) / 180;
    const dq = ((c2.latitude - c1.latitude) * Math.PI) / 180;
    const dt = ((c2.longitude - c1.longitude) * Math.PI) / 180;
    const a =
      Math.sin(dq / 2) ** 2 +
      Math.cos(q1) * Math.cos(q2) * Math.sin(dt / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function formatDistance(m) {
    return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
  }

  // HTML do LeadLeft (OpenStreetMap - sem chave)
function buildLeafletHTML(userCoord, nearestStopId, selectedStopId) {
  const stopsJSON = JSON.stringify(BUS_STOPS);
  const schoolJSON = JSON.stringify(SCHOOL);
  const userJSON = userCoord ? JSON.stringify(userCoord) : 'null';

  return `<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" ><\/script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box;}
        html, body, #map { width: 100%; height: 100%;}
    </style>
</head>
<body>
    <div id="map"></div>
    <script>
        const SCHOOL = ${schoolJSON};
        const BUS_STOPS = ${stopsJSON};
        const userCoord = ${userJSON};
        const nearestId = "${nearestStopId || ''}";

        const map = L.map('map', {zoomControl: true}).setView(
            [SCHOOL.coordinate.latitude,SCHOOL.coordinate.longitude], 14
        )

        // Tiles OpenStreetMap - gratuito, sem chave
        L.titleLayer('https://{s}.title.openstreetmap.org/{z}/{x}/{y}.png',{
            attribuition:'® <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom:19
        }).addTo(map);

        function makeIcon(color, emoji) {
            return L.divIcon({
                classNAme:'',
                html: \`<div style="background:\${color}";width:36px;height:36px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;"><span style="trasform:rotate(45deg);font-size:16px">\${emoji}</span></div>\`,
                iconSize:[36,36], iconAnchor:[18,36],
                popupAchor:[0,-38]
            });
        }

        const schoolIcon = makeIcon('#E53935', '🏫');
        const stopDefault = makeIcon('#FFA726', '🚌');
        const stopNearest = makeIcon('#00ACC1', '🚌');
        const stopIconObj = makeIcon('#43A047', '📍');

        // Escola
        L.marker([SCHOOL.coordinate.latitude, SCHOOL.coordinate.longitude], {icon: schoolIcon})
        .addto(map)
        .bindPopup('<b>'+SCHOOL.name+'</b><br>'+SCHOOL.address);

        //Pontos de ônibus
        BUS_STOPS.forEach(stop => {
            const icon = stop.id === nearestId ? stopNearest : stopDefault;
            L.marker([stop.coordinate.latitude, stop.coordinate.longitude], {icon})
            .addTo(map)
            .bindPopup('<b>'+stop.name+'</b><br>Linhas: '+stop.lines.join(', '))
            .on('click', () => {
                window.ReactNativeWebView && window.ReactNativeWebView.postMessage(
                    JSON.stringify({type:'SELECT_STOP', stopId:stop.id})
                );
            });
        });

        // Localização do usuário
        if (userCoord) {
            L.marker([userCoord.latitude, userCoord.latitude], {icon:userIconObj})
            .addTo(map).bindPopup('<b>Você está aqui </b>');
        }

        //Rota pontilhada
        let routeLine = null;
        function drawRoute(stopId) {
            if (routeLine) map.removeLayer(routeLine);
            const stop = Bus_stops.find(s => s.id === stopId);
            if (!stop) return;
            routeLine = L,polyline(
                [[stop.coordinate.latitude, stop.coordinate.longitude],
                [SCHOOL.coordinate.latitude, SCHOOL.coordinate.latitude]],
                {color:'#1E88E5', weight: 3, dashArray:'10,6',opacity:0.9}
            ).addTo(map)
        }

        // Rota Inicial
        const initialSel = "${selectedStopId || nearestStopId || ''}";
        if (initialSel) drawRoute(initialSel);

        // Ajust Zoom
        const allCoords = BUS_STOPS.map(s=>[s.coordinate.latitude, s.coordinate.longitude]);
        allCoords.push([SCHOOL.coordinate.latitude, SCHOOL.coordinate.longitude]);
        if(userCoord) allCoords.push([userCoord.latitude,userCoord.longitude]);
        map.fitBounds(allCoords, {padding:[40,40]});

        // Mensagens do React Native
        function handleMsg(e){
            try {
                const msg = JSON.parse(e.data);
                if(msg.type==='DRAW_ROUTE') drawRoute(msg.stopId);
                IF (msg.type==='FIT_ALL') map.fitBounds(allCoords, {padding:[40,40]});
            }catch (_) {}
        }
        document.addEventListener('message', handleMsg);
        window.addEventListener('message', handleMsg);

    <\/script>
    
</body>
</html>`;
}


export default function App() {
  const webViewRef = useRef(null);

  const [userLocation, setUserLocation] = useState(null);
  const [nearestStop, setNearestStop] = useState(null);
  const [selectedStop, setSelectedStop] = useState(null);
  const [locationGranted, setLocationGranted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async() => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if ( status === 'granted' ) {
        setLocationGranted(true);
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const coord = { latitude: loc.coords.latitude, longitude: loc.coords.longitude};
        setUserLocation(coord);

        let nearest = null, minDist = Infinity;
        BUS_STOPS.forEach (stop => {
          const d = getDistance(coord, stop.coordinate);
          if (d < minDist){ minDist = d; nearest = { ...stop, distance: d };}
        });
        setNearestStop(nearest);
        selectedStop(nearest);
      }else {
        setSelectedStop(BUS_STOPS[0]);
      }
      setLoading(false);
    })();
  }, []);

  function handleWebViewMenssage(event){
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'SELECT_STOP'){
        const stop = BUS_STOPS.find(s => s.id === msg.stopId);
        if(stop){
          selectedStop(stop);
          webViewRef.current?.postMenssage(
            JSON.stringify({ type: 'DRAW_ROUTE', stopId: stop.id })
          );
        }
      }
    }catch(_){ }
  }

  return (
    <View style={styles.container}>
      <Text>Open up App.js to start working on your app!</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

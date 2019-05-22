# Документация для работы с сервисом cyberway.golos_wallet

## Пояснения

Golos_wallet -- сервис, который предоставляет удобный API для взаимодействия с котрактом cyber.token, а именно получать информацию по токенам, трансферам и балансам пользователей cyber.token.

Изначально кошелёк создавался как сервис для биржы Bittrex, который должен был 1 в 1 имитировать cli_wallet. cli_wallet -- консольная утилита для цепочки golos, имеющая возможность взаимодействия с ней через json-rpc интерфейс. Для этого нужно было прописать ключ -r и передать endpoint (пр. 127.0.0.1:2001).

Поэтому у кошелька по сути есть два подмножества методов: унаследованные от cli_wallet и новые, которые упрощаяют работу с cyber.token. Соответственно основное их внешнее различие в нотации:
первые -- `underscore_notation`, вторые -- `smallCamleCase`.

#### Описание механики поддержки актуального состояния балансов пользователей в базе кошелька

**TODO**

#### Формат запросов и ответов
Общение происходит по протоколу [JSON-RPC 2.0](https://www.jsonrpc.org/specification) с некоторыми более строгими
правилами:

- Параметры запроса должны только быть именованными, в виде JSON-объекта, безымянные не поддерживаются.
- Результат запроса в поле `result` всегда содержит JSON объект с результатом выполнения.
- В случае ошибки в поле `error` всегда содержится ответ формата `{"code": 123, "message": "Description text"}`,
  где `code` это цифровой код ошибки, описывающий тип проишествия, а `description` - текстовую ремарку для понимания
  ошибки человеком.
- RPC-нотификации работают как указано в стандарте, запросы без поля `id` не получают ответа, но сервер может
  их обработать по своему усмотрению.

Дополнительно стоит учитывать что сервер сам может передавать данные на клиент без получения запроса - например
так работает рассылка о событиях для пользователя, данные поступают через WebSocket со стороны сервера и
являются RPC-нотификациями, что не требует от клиента возвращать серверу какой-либо ответ.

## Что использует сервис

- MongoDB -- база для хранения информации по cyber.token
- Nats -- очередь, к которой можно подключиться для получения рассылки эвентов от EventEngine.

## Запуск сервиса

#### docker-compose
Для запуска сервиса достаточно вызвать команду `docker-compose up --build` в корне проекта, предварительно указав
необходимые `ENV` переменные.
Это запустит два контейнера: `wallet-mongo` и `wallet-node`.

## Инициализационные параметры

Для запуска сервиса необходимо в корень проекта положить `.env` файл. За основу можно взять `.env.example`.


Основные переменные окружения `ENV`:
  
 - `GLS_CONNECTOR_HOST` *(обязательно)* - адрес, который будет использован для входящих подключений связи микросервисов.  
  Дефолтное значение при запуске без докера - `127.0.0.1`

 - `GLS_CONNECTOR_PORT` *(обязательно)* - адрес порта, который будет использован для входящих подключений связи микросервисов.  
  Дефолтное значение при запуске без докера - `3000`

 - `GLS_METRICS_HOST` - адрес хоста для метрик StatsD.  
  Дефолтное значение при запуске без докера - `127.0.0.1`

 - `GLS_METRICS_PORT` - адрес порта для метрик StatsD.  
  Дефолтное значение при запуске без докера - `8125`
 
 - `GLS_BLOCKCHAIN_BROADCASTER_CONNECT` *(обязательно)* - адрес nats для получения эвентов от EventEngine подключенного к ноде cyberway

 - `GLS_MONGO_CONNECT` - строка подключения к базе MongoDB.  
  Дефолтное значение - `mongodb://mongo/admin`


## API

### getBalance
**Запрос :arrow_right:**

| Процедура  | Авторизация  | Описание                        |
|:----------:|:------------:|---------------------------------|
| getBalance | Не требуется | Получить баллансы пользователей |

|  Параметр  |  Тип   | Обяз. | Описание                          |
|:----------:|:------:|:-----:|-----------------------------------|
|    name    | string |  Да   | Имя пользователя                  |
| tokensList | string |  нет  | Массив `sym` интересующих токенов |

**Пример :one::**

Получаем баланс по всем токенам для пользователя `destroyer`

```json
{
  "id": 1,
  "jsonrpc": "2.0",
  "method": "getBalance",
  "params": {
    "name": "destroyer"
  }
}
```

**:arrow_left: Ответ**
```json
{
  "jsonrpc": "2.0",
  "id": 991579,
  "result": {
    "name": "destroyer",
    "balances": [
      {
        "amount": 48,
        "decs": 3,
        "sym": "GLS"
      }
    ]
  }
}
```

**Пример :two::**

```json
{
  "id": 1,
  "jsonrpc": "2.0",
  "method": "getBalance",
  "params": {
    "name": "cyber.token",
    "tokensList": ["ABCXXXX", "ABXXXXX"]
  }
}
```

**:arrow_left: Ответ**
```json
{
  "id": 1,
  "jsonrpc": "2.0",
  "result": {
    "balances": [
      {
        "amount": 100000000,
        "decs": 4,
        "sym": "ABXXXXX"
      },
      {
        "amount": 1000000000,
        "decs": 4,
        "sym": "ABCXXXX"
      }
    ],
    "name": "cyber.token"
  }
}

```

**:x: Ошибки**

| error code |                               message                               | Описание                                           |
|:----------:|:-------------------------------------------------------------------:|----------------------------------------------------|
|    805     | getBalance: invalid argument: tokens param must be array of strings | Передан некорректный параметр `tokensList`         |
|    809     |                 getBalance: name must be a string!                  | Передан некорректный параметр `name`               |
|    809     |        getBalance: any tokensList element must be a string!         | Передан некорректный элемент массива `tokensList`  |
|    810     |              getBalance: name can not be empty string!              | Передана пустая строка в качестве параметра `name` |

---

### getHistory
**Запрос :arrow_right:**

| Процедура  | Авторизация  | Описание                                  |
|:----------:|:------------:|-------------------------------------------|
| getHistory | Не требуется | Получить историю трансферов пользователей |

|  Параметр   |      Тип       | Обяз. | Описание                                                                                                                                                                             |
|:-----------:|:--------------:|:-----:|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|   sender    |    `string`    |  Нет  | Имя отправителя трансфера                                                                                                                                                            |
|  receiver   |    `string`    |  Нет  | Имя получателя трансфера                                                                                                                                                             |
| sequenceKey | `null` or `string` |  Да   | Отступ от начала списка. Если передана строка с валидным sequenceKey, то будет возвращено не более `limit` элементов начиная со следующего за элементом с `_id` равным `sequenceKey` |
|    limit    |     `number`     |  Да   | Количество записей из списка трансферов. В паре с `limit` формирует отрезок запроса: `[begin, from]` размером `limit`. Не может быть больше `from`, если `from > -1`                 |


#### Необходимо указать отправителя и получателя. Для работы необходим хотя бы один из них.

Пример:

Получаем все транзакции с отправителем `cyber.token` и получателем `korpusenko`

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "getHistory",
  "params": {
    "sender": "tst1drgfnsgy",
    "sequenceKey": null,
    "limit": 3
  }
}
```

**:arrow_left: Ответ**

Если трансферы соответствующие запросу существуют, то будет возващён массив объектов `TransferModel`, иначе пустой массив.

```json
{
  "jsonrpc": "2.0",
  "id": 762417,
  "result": {
    "items": [
      {
        "id": "5cdc2a2d9e432c3bee8a55f4",
        "sender": "tst1drgfnsgy",
        "receiver": "gls.vesting",
        "quantity": {
          "amount": 100,
          "decs": 3,
          "sym": "GOLOS"
        },
        "trx_id": "79690b14798d2df9003a05632a8a9aefdbef8cbda9b557ac8771a8450871e8ce",
        "block": 582012,
        "timestamp": "2019-05-15T15:03:03.000Z"
      }
    ],
    "itemsSize": 1,
    "sequenceKey": "5cdc2a2d9e432c3bee8a55f4"
  }
}
```

**:x: Ошибки**

| error code |     message     | Описание                        |
|:----------:|:---------------:|---------------------------------|
|    805     | Wrong arguments | Переданы некорректные параметры |

---

### getTokensInfo
**Запрос :arrow_right:**

|   Процедура   | Авторизация  | Описание                                            |
|:-------------:|:------------:|-----------------------------------------------------|
| getTokensInfo | Не требуется | Получить информацию по токенам хранящимся в системе |

| Параметр |   Тип    | Обяз. | Описание                                |
|:--------:|:--------:|:-----:|-----------------------------------------|
|  tokens  | string[] |  Да   | Массив строк `sym` интересующих токенов |

Пример:

Получим информацию по некоторым токенам:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "getTokensInfo",
  "params": {
    "tokens": ["AXXXXX", "ABXXXXX", "ABCXXXX"]
  }
}
```

**ИЛИ**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "getTokensInfo",
  "params": {
    "tokens": ["AXXXXX", "ABXXXXX", "ABCXXXX"]
  }
}
```

**:arrow_left: Ответ**

Будет возвращён массив с информацией по запрашиваемым токенам, которые были найдены в базе. Если на входе в массиве были токены, которых нет в базе, то для них будет отсутствовать запись в возвращаемом результате.

```json
{
  "id": 1,
  "jsonrpc": "2.0",
  "result": {
    "tokens": [
      {
        "issuer": "cyber.token",
        "max_supply": {
          "amount": 10000000,
          "decs": 4,
          "sym": "AXXXXX"
        },
        "supply": {
          "amount": 10000000,
          "decs": 4,
          "sym": "AXXXXX"
        },
        "sym": "AXXXXX"
      },
      {
        "issuer": "cyber.token",
        "max_supply": {
          "amount": 100000000,
          "decs": 4,
          "sym": "ABXXXXX"
        },
        "supply": {
          "amount": 100000000,
          "decs": 4,
          "sym": "ABXXXXX"
        },
        "sym": "ABXXXXX"
      },
      {
        "issuer": "cyber.token",
        "max_supply": {
          "amount": 1000000000,
          "decs": 4,
          "sym": "ABCXXXX"
        },
        "supply": {
          "amount": 1000000000,
          "decs": 4,
          "sym": "ABCXXXX"
        },
        "sym": "ABCXXXX"
      }
    ]
  }
}
```

**:x: Ошибки**

| error code |     message     | Описание                      |
|:----------:|:---------------:|-------------------------------|
|    805     | Wrong arguments | Передан некорректный аргумент |

---

### filter_account_history
**Запрос :arrow_right:**

|       Процедура        | Авторизация  | Описание                                                                                                      |
|:----------------------:|:------------:|---------------------------------------------------------------------------------------------------------------|
| filter_account_history | Не требуется | Получить историю трансферов пользователя. Отличается от `getHistory` настройкой фильтров (как в `cli_wallet`) |

| Параметр |  Тип   | Обяз. | Описание                                                                                                                                                             |
|:--------:|:------:|:-----:|----------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| account  | string |  Да   | Имя пользователя                                                                                                                                                     |
|   from   | number |  Да   | Размер отступа от начала списка трансферов в базе. Значение `-1` указывает на конец списка                                                                           |
|  limit   | number |  Да   | Количество записей из списка трансферов. В паре с `limit` формирует отрезок запроса: `[begin, from]` размером `limit`. Не может быть больше `from`, если `from > -1` |
|  query   | object |  Да   | Фильтр для запросов. Обязательно должен быть указан хотя бы один параметр                                                                                            |

#### Параметры query

|      Параметр      |  Тип   | Обяз. | Описание                                                              |
|:------------------:|:------:|:-----:|-----------------------------------------------------------------------|
|     select_ops     | object |  Нет  | **Не реализовано**                                                    |
|     filter_ops     | object |  Нет  | **Не реализовано**                                                    |
|     direction      | object |  Нет  | Указывает роль `account` в трансфере                                  |
|  direction.sender  | object |  Нет  | Фильтрует только те трансферы, где отправитель `account`              |
| direction.receiver | object |  Нет  | Фильтрует только те трансферы, где получатель `account`               |
|   direction.dual   | object |  Нет  | Фильтрует только те трансферы, где отправитель и получатель `account` |
|  direction === {}  | object |  Нет  | Позволяет получить все трансферы, где фигурирует  `account`           |

Пример:

Получаем все транзакции с отправителем `cyber.token`

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "filter_account_history",
  "params": [
    "cyber.token",
    -1,
    100,
    {}
  ]
}
```
**Или**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "filter_account_history",
  "params": {
    "account": "cyber.token",
    "from": -1,
    "limit": 100,
    "query": {}
  }
}
```


**:arrow_left: Ответ**

Если трансферы соответствующие запросу существуют, то будет возващён массив объектов `TransferModel`, иначе пустой массив.

```json
{
  "id": 1,
  "jsonrpc": "2.0",
  "result": [
    [
      0,
      {
        "block": 905226,
        "op": [
          "transfer",
          {
            "amount": "1.0000 GLS",
            "from": "cyber.token",
            "memo": "{}",
            "to": "korpusenko"
          }
        ],
        "timestamp": "2019-04-01T18:34:27.000",
        "trx_id": "551fd2f848bc32ee256c2880b2186b5307908448f37ca7850e09ef46142f5b9b"
      }
    ],
    [
      1,
      {
        "block": 905227,
        "op": [
          "transfer",
          {
            "amount": "2.0000 GLS",
            "from": "cyber.token",
            "memo": "{}",
            "to": "korpusenko"
          }
        ],
        "timestamp": "2019-04-01T18:34:30.000",
        "trx_id": "6619198ac252582755e641a743a1fe7663ec28b726180f21c50e1d4dd62af737"
      }
    ]
  ]
}
```

**:x: Ошибки**

| error code |     message     | Описание                        |
|:----------:|:---------------:|---------------------------------|
|    805     | Wrong arguments | Переданы некорректные параметры |


---

## Vesting

### getVestingInfo
**Запрос :arrow_right:**

|   Процедура    | Авторизация  | Описание                             |
|:--------------:|:------------:|--------------------------------------|
| getVestingInfo | Не требуется | Получить общую информацию о вестинге |

| Параметр | Тип | Обяз. | Описание |
|:--------:|:---:|:-----:|----------|
|   none   |     |       |          |

Пример:

Получим информацию о вестинге:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "getVestingInfo",
  "params": {
  }
}
```

**:arrow_left: Ответ**

Общая информация о вестинге

```json
{
  "jsonrpc": "2.0",
  "id": 392414,
  "result": {
    "sym": "GOLOS",
    "amount": 2435353591739789000,
    "decs": 6
  }
}
```

**:x: Ошибки**

| error code |     message     | Описание                      |
|:----------:|:---------------:|-------------------------------|

---



### getVestingBalance
**Запрос :arrow_right:**

|     Процедура     | Авторизация  | Описание                                                                                              |
|:-----------------:|:------------:|-------------------------------------------------------------------------------------------------------|
| getVestingBalance | Не требуется | Получить информацию о состоянии вестинга конкретного пользователя: `vesting`, `delegated`, `received` |

| Параметр |  Тип   | Обяз. | Описание         |
|:--------:|:------:|:-----:|------------------|
| account  | string |  Да   | Имя пользователя |

Пример:

Получим информацию о вестинге `testuser`:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "getVestingBalance",
  "params": {
    "account": "testuser"
  }
}
```

**:arrow_left: Ответ**

Информация о вестинге для пользователя `testuser`

```json
{
  "jsonrpc": "2.0",
  "id": 73233,
  "result": {
    "account": "testuser",
    "vesting": {
      "sym": "GOLOS",
      "amount": 183187504,
      "decs": 6
    },
    "delegated": {
      "sym": "GOLOS",
      "amount": 0,
      "decs": 6
    },
    "received": {
      "sym": "GOLOS",
      "amount": 0,
      "decs": 6
    }
  }
}
```

**:x: Ошибки**


| error code |                         message                          | Описание                                              |
|:----------:|:--------------------------------------------------------:|-------------------------------------------------------|
|    809     |    getVestingBalance: account name must be a string!     | Передан некорректный параметр `account`               |
|    810     | getVestingBalance: account name can not be empty string! | Передана пустая строка в качестве параметра `account` |

---


### getVestingHistory
**Запрос :arrow_right:**

|     Процедура     | Авторизация  | Описание                                                                               |
|:-----------------:|:------------:|----------------------------------------------------------------------------------------|
| getVestingHistory | Не требуется | Получить историю изменения вестинга пользователя. Использует механику `from` - `limit` |

|  Параметр   |      Тип       | Обяз. | Описание                                                                                                                                                                             |
|:-----------:|:--------------:|:-----:|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|   account   |     string     |  Да   | Имя пользователя                                                                                                                                                                     |
| sequenceKey | null or string |  Да   | Отступ от начала списка. Если передана строка с валидным sequenceKey, то будет возвращено не более `limit` элементов начиная со следующего за элементом с `_id` равным `sequenceKey` |
|    limit    |     number     |  Да   | Количество записей из списка трансферов. В паре с `limit` формирует отрезок запроса: `[begin, from]` размером `limit`. Не может быть больше `from`, если `from > -1`                 |

Пример:

Получим историю изменений вестинга `testuser`:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "getVestingHistory",
  "params": {
    "account": "testuser",
    "sequenceKey": null,
    "limit": 3
  }
}
```

**:arrow_left: Ответ**

История изменения вестинга для пользователя `testuser`

```json
{
  "jsonrpc": "2.0",
  "id": 403244,
  "result": {
    "items": [
      {
        "id": "5cd3039623f8c258e4961576",
        "who": "testuser",
        "diff": {
          "amount": 3456368,
          "decs": 6,
          "sym": "GOLOS"
        },
        "block": 438008,
        "trx_id": "d5728b644de2f35461095d1c67c478e35ed55e95aec045d8bed547567c3e6dcb",
        "timestamp": "2019-05-08T16:28:00.000Z"
      },
      {
        "id": "5cd3023423f8c2bc119614fc",
        "who": "testuser",
        "diff": {
          "amount": 3456368,
          "decs": 6,
          "sym": "GOLOS"
        },
        "block": 437890,
        "trx_id": "ec17e372ee2cbe8c134a9bc1e9a0d73dd06a50b8aedea778756dada573bf95d6",
        "timestamp": "2019-05-08T16:22:06.000Z"
      },
      {
        "id": "5cd3023123f8c2c2509614f7",
        "who": "testuser",
        "diff": {
          "amount": 3456368,
          "decs": 6,
          "sym": "GOLOS"
        },
        "block": 437889,
        "trx_id": "9004079ce5bc1eaef48875b48be3bc2f75302465f769d1d1910b7ad83c2b9a04",
        "timestamp": "2019-05-08T16:22:03.000Z"
      }
    ],
    "itemsSize": 3,
    "sequenceKey": "5cd3023123f8c2c2509614f7"
  }
}
```

**:x: Ошибки**


| error code |     message     | Описание                        |
|:----------:|:---------------:|---------------------------------|
|    805     | Wrong arguments | Переданы некорректные параметры |

---
package io.github.pedrohda.nossocasamento;

import android.Manifest;
import android.content.ContentResolver;
import android.content.ContentUris;
import android.content.ContentValues;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.net.Uri;
import android.provider.CalendarContract;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.util.HashSet;
import java.util.Iterator;
import java.util.Set;
import org.json.JSONArray;
import org.json.JSONObject;

@CapacitorPlugin(
  name = "PlanningCalendar",
  permissions = {
    @Permission(
      alias = "calendar",
      strings = {
        Manifest.permission.READ_CALENDAR,
        Manifest.permission.WRITE_CALENDAR,
      }
    ),
  }
)
public class PlanningCalendarPlugin extends Plugin {

  private boolean allowed() {
    return getPermissionState("calendar") == PermissionState.GRANTED;
  }

  private SharedPreferences preferences() {
    return getContext().getSharedPreferences("planning-calendar-v1", 0);
  }

  @PluginMethod
  public void listCalendars(PluginCall call) {
    if (!allowed()) {
      requestPermissionForAlias("calendar", call, "calendarPermissionResult");
      return;
    }
    try {
      JSArray result = new JSArray();
      String[] fields = {
        CalendarContract.Calendars._ID,
        CalendarContract.Calendars.CALENDAR_DISPLAY_NAME,
        CalendarContract.Calendars.ACCOUNT_NAME,
      };
      try (
        Cursor rows = getContext()
          .getContentResolver()
          .query(
            CalendarContract.Calendars.CONTENT_URI,
            fields,
            CalendarContract.Calendars.CALENDAR_ACCESS_LEVEL +
              ">=? AND " +
              CalendarContract.Calendars.VISIBLE +
              "=1",
            new String[] {
              String.valueOf(CalendarContract.Calendars.CAL_ACCESS_CONTRIBUTOR),
            },
            null
          )
      ) {
        if (rows != null) while (rows.moveToNext()) {
          JSObject item = new JSObject();
          item.put("id", rows.getString(0));
          item.put("name", rows.getString(1));
          item.put("account", rows.getString(2));
          result.put(item);
        }
      }
      JSObject response = new JSObject();
      response.put("calendars", result);
      call.resolve(response);
    } catch (Exception e) {
      call.reject("Não foi possível listar os calendários do aparelho.", e);
    }
  }

  @PermissionCallback
  private void calendarPermissionResult(PluginCall call) {
    if (allowed()) listCalendars(call);
    else call.reject(
      "O calendário não foi autorizado. Os dados continuam salvos no app."
    );
  }

  private JSONObject readLinks(String planId) throws Exception {
    return new JSONObject(preferences().getString(planId, "{}"));
  }

  private void saveLinks(String planId, JSONObject links) {
    if (
      !preferences().edit().putString(planId, links.toString()).commit()
    ) throw new IllegalStateException("Falha ao guardar vínculo da agenda.");
  }

  private boolean owned(
    ContentResolver resolver,
    long id,
    String planId,
    String itemId
  ) {
    try (
      Cursor row = resolver.query(
        ContentUris.withAppendedId(CalendarContract.Events.CONTENT_URI, id),
        new String[] { CalendarContract.Events.DESCRIPTION },
        CalendarContract.Events.DELETED + "=0",
        null,
        null
      )
    ) {
      return (
        row != null &&
        row.moveToFirst() &&
        row.getString(0) != null &&
        row.getString(0).contains("[" + planId + ":" + itemId + "]")
      );
    }
  }

  private void writable(ContentResolver resolver, long calendarId) {
    try (
      Cursor row = resolver.query(
        ContentUris.withAppendedId(
          CalendarContract.Calendars.CONTENT_URI,
          calendarId
        ),
        new String[] { CalendarContract.Calendars.CALENDAR_ACCESS_LEVEL },
        null,
        null,
        null
      )
    ) {
      if (
        row == null ||
        !row.moveToFirst() ||
        row.getInt(0) < CalendarContract.Calendars.CAL_ACCESS_CONTRIBUTOR
      ) throw new IllegalArgumentException(
        "O calendário escolhido não está disponível para edição."
      );
    }
  }

  @PluginMethod
  public void connect(PluginCall call) {
    if (!allowed()) {
      call.reject("Autorize o calendário antes de conectar.");
      return;
    }
    try {
      String planId = call.getString("planId", "");
      String calendarId = call.getString("calendarId", "");
      if (
        !planId.matches("[A-Za-z0-9-]{1,100}")
      ) throw new IllegalArgumentException("Planejamento inválido.");
      writable(getContext().getContentResolver(), Long.parseLong(calendarId));
      if (
        !preferences()
          .edit()
          .putString("authorized:" + planId, calendarId)
          .commit()
      ) throw new IllegalStateException(
        "Não foi possível salvar a autorização."
      );
      call.resolve();
    } catch (Exception e) {
      call.reject("Não foi possível conectar a agenda.", e);
    }
  }

  @PluginMethod
  public synchronized void syncEvents(PluginCall call) {
    if (!allowed()) {
      call.reject("Autorize o calendário novamente para atualizar os eventos.");
      return;
    }
    try {
      String planId = call.getString("planId", "");
      String calendarText = call.getString("calendarId", "");
      JSONArray events = call.getArray("events");
      if (
        !calendarText.equals(
          preferences().getString("authorized:" + planId, "")
        )
      ) throw new IllegalStateException(
        "Confirme a conexão com a agenda neste aparelho. Uma autorização de outro celular ou backup não ativa o calendário automaticamente."
      );
      if (
        !planId.matches("[A-Za-z0-9-]{1,100}") ||
        events == null ||
        events.length() > 250
      ) throw new IllegalArgumentException("Dados da agenda inválidos.");
      long calendarId = Long.parseLong(calendarText);
      ContentResolver resolver = getContext().getContentResolver();
      writable(resolver, calendarId);
      JSONObject links = readLinks(planId);
      Set<String> incoming = new HashSet<>();
      // Validate the complete payload before changing any event.
      for (int i = 0; i < events.length(); i++) {
        JSONObject item = events.getJSONObject(i);
        String key = item.getString("id");
        long start = item.getLong("start"),
          end = item.getLong("end");
        int minutes = item.getInt("reminderMinutes");
        if (
          key.isEmpty() ||
          key.length() > 150 ||
          !incoming.add(key) ||
          start <= 0 ||
          end <= start ||
          minutes < 0 ||
          minutes > 43200 ||
          item.getString("title").length() > 200
        ) throw new IllegalArgumentException(
          "Um dos eventos possui dados inválidos."
        );
      }
      for (int i = 0; i < events.length(); i++) {
        JSONObject item = events.getJSONObject(i);
        String key = item.getString("id");
        String description = item.getString("description");
        String fingerprint = item.toString();
        JSONObject link = links.optJSONObject(key);
        long nativeId = link == null ? -1 : link.optLong("id", -1);
        if (nativeId > 0 && !owned(resolver, nativeId, planId, key)) nativeId =
          -1;
        if (nativeId > 0 && link.optLong("calendarId", -1) != calendarId) {
          resolver.delete(
            ContentUris.withAppendedId(
              CalendarContract.Events.CONTENT_URI,
              nativeId
            ),
            null,
            null
          );
          nativeId = -1;
        }
        if (nativeId < 0) {
          // Recover an insert whose process stopped before its ID was persisted.
          try (
            Cursor previous = resolver.query(
              CalendarContract.Events.CONTENT_URI,
              new String[] { CalendarContract.Events._ID },
              CalendarContract.Events.CALENDAR_ID +
                "=? AND " +
                CalendarContract.Events.DESCRIPTION +
                "=? AND " +
                CalendarContract.Events.DELETED +
                "=0",
              new String[] { calendarText, description },
              null
            )
          ) {
            if (previous != null && previous.moveToFirst()) nativeId =
              previous.getLong(0);
          }
        }
        if (
          nativeId > 0 &&
          link != null &&
          link.optLong("id", -1) == nativeId &&
          link.optLong("calendarId", -1) == calendarId &&
          fingerprint.equals(link.optString("fingerprint"))
        ) continue;
        ContentValues values = new ContentValues();
        values.put(CalendarContract.Events.CALENDAR_ID, calendarId);
        values.put(CalendarContract.Events.TITLE, item.getString("title"));
        values.put(CalendarContract.Events.DTSTART, item.getLong("start"));
        values.put(CalendarContract.Events.DTEND, item.getLong("end"));
        values.put(CalendarContract.Events.EVENT_TIMEZONE, "America/Sao_Paulo");
        values.put(
          CalendarContract.Events.EVENT_LOCATION,
          item.optString("location", "")
        );
        values.put(CalendarContract.Events.DESCRIPTION, description);
        values.put(CalendarContract.Events.HAS_ALARM, 1);
        if (nativeId > 0) resolver.update(
          ContentUris.withAppendedId(
            CalendarContract.Events.CONTENT_URI,
            nativeId
          ),
          values,
          null,
          null
        );
        else {
          Uri inserted = resolver.insert(
            CalendarContract.Events.CONTENT_URI,
            values
          );
          if (inserted == null) throw new IllegalStateException(
            "Não foi possível criar um evento."
          );
          nativeId = ContentUris.parseId(inserted);
        }
        JSONObject checkpoint = new JSONObject();
        checkpoint.put("id", nativeId);
        checkpoint.put("calendarId", calendarId);
        links.put(key, checkpoint);
        saveLinks(planId, links);
        resolver.delete(
          CalendarContract.Reminders.CONTENT_URI,
          CalendarContract.Reminders.EVENT_ID + "=?",
          new String[] { String.valueOf(nativeId) }
        );
        ContentValues reminder = new ContentValues();
        reminder.put(CalendarContract.Reminders.EVENT_ID, nativeId);
        reminder.put(
          CalendarContract.Reminders.METHOD,
          CalendarContract.Reminders.METHOD_ALERT
        );
        reminder.put(
          CalendarContract.Reminders.MINUTES,
          item.getInt("reminderMinutes")
        );
        if (
          resolver.insert(CalendarContract.Reminders.CONTENT_URI, reminder) ==
          null
        ) throw new IllegalStateException(
          "Não foi possível criar o aviso do evento."
        );
        checkpoint.put("fingerprint", fingerprint);
        links.put(key, checkpoint);
        saveLinks(planId, links);
      }
      Set<String> remove = new HashSet<>();
      Iterator<String> keys = links.keys();
      while (keys.hasNext()) {
        String key = keys.next();
        if (incoming.contains(key)) continue;
        long id = links.getJSONObject(key).getLong("id");
        if (!owned(resolver, id, planId, key)) {
          remove.add(key);
          continue;
        }
        try (
          Cursor row = resolver.query(
            ContentUris.withAppendedId(CalendarContract.Events.CONTENT_URI, id),
            new String[] { CalendarContract.Events.DTEND },
            null,
            null,
            null
          )
        ) {
          if (
            row != null &&
            row.moveToFirst() &&
            row.getLong(0) < System.currentTimeMillis()
          ) continue;
        }
        resolver.delete(
          ContentUris.withAppendedId(CalendarContract.Events.CONTENT_URI, id),
          null,
          null
        );
        remove.add(key);
      }
      for (String key : remove) links.remove(key);
      saveLinks(planId, links);
      JSObject result = new JSObject();
      result.put("count", events.length());
      call.resolve(result);
    } catch (Exception e) {
      call.reject("Não foi possível atualizar a agenda: " + e.getMessage(), e);
    }
  }

  @PluginMethod
  public synchronized void disconnect(PluginCall call) {
    if (!allowed()) {
      call.reject(
        "Autorize o calendário para remover as cópias criadas pelo app."
      );
      return;
    }
    try {
      String planId = call.getString("planId", "");
      JSONObject links = readLinks(planId);
      ContentResolver resolver = getContext().getContentResolver();
      int count = 0;
      Iterator<String> keys = links.keys();
      while (keys.hasNext()) {
        String key = keys.next();
        long id = links.getJSONObject(key).getLong("id");
        if (owned(resolver, id, planId, key)) count += resolver.delete(
          ContentUris.withAppendedId(CalendarContract.Events.CONTENT_URI, id),
          null,
          null
        );
      }
      preferences()
        .edit()
        .remove(planId)
        .remove("authorized:" + planId)
        .commit();
      JSObject result = new JSObject();
      result.put("removed", count);
      call.resolve(result);
    } catch (Exception e) {
      call.reject("Não foi possível remover as cópias da agenda.", e);
    }
  }
}
